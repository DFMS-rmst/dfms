import crypto from 'node:crypto';
import argon2 from 'argon2';
import { Router } from 'express';
import { z } from 'zod';
import { env } from '../../config/env.js';
import {
  authenticate,
  authenticateVerificationToken,
  signAccessToken,
  signVerificationToken,
} from '../../common/auth.js';
import { AppError, asyncHandler } from '../../common/errors.js';
import { validate } from '../../common/validation.js';
import { prisma } from '../../infrastructure/prisma/client.js';
import { appendAudit } from '../audit/index.js';

const credentialsSchema = z.object({
  email: z
    .string()
    .email()
    .max(191)
    .transform((v) => v.toLowerCase()),
  password: z.string().min(10).max(128),
});
const optionalTrimmedString = (schema) =>
  z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    schema.optional(),
  );
const registerSchema = credentialsSchema.extend({
  fullName: z.string().trim().min(2).max(160),
  phone: optionalTrimmedString(z.string().trim().min(7).max(32)),
  role: z.enum(['VETERINARIAN', 'FARMER', 'DAIRY_OWNER']).optional(),
});
const cookieName = 'refresh_token';
const tokenHash = (token) => crypto.createHash('sha256').update(token).digest('hex');
const publicUser = (user) => ({
  id: user.id,
  email: user.email,
  phone: user.phone,
  fullName: user.fullName,
  status: user.status,
  pendingRole: user.pendingRole || null,
  platformRoles: (user.platformRoles || []).map((item) => item.role),
  veterinarian: {
    exists: Boolean(user.veterinarian),
    status: user.veterinarian?.status || null,
  },
  farmerProfile: {
    exists: Boolean(user.farmerProfile),
    status: user.farmerProfile?.status || null,
    farmName: user.farmerProfile?.farmName || null,
    farmerIdNumber: user.farmerProfile?.farmerIdNumber || null,
    farmId: user.farmerProfile?.farmId || null,
  },
  dairyOwnerProfile: {
    exists: Boolean(user.dairyOwnerProfile),
    status: user.dairyOwnerProfile?.status || null,
    dairyName: user.dairyOwnerProfile?.dairyName || null,
    fssaiLicenseNumber: user.dairyOwnerProfile?.fssaiLicenseNumber || null,
  },
  farmMemberships: (user.memberships || []).map((membership) => ({
    membershipId: membership.id,
    farmId: membership.farmId,
    farmName: membership.farm.name,
    farmStatus: membership.farm.status,
    roles: membership.roles.map((item) => item.role),
  })),
});
const authorizationInclude = {
  platformRoles: true,
  veterinarian: {
    select: { id: true, status: true, registrationNumber: true, qualification: true },
  },
  farmerProfile: {
    select: { id: true, status: true, farmName: true, farmerIdNumber: true, farmId: true },
  },
  dairyOwnerProfile: {
    select: { id: true, status: true, dairyName: true, fssaiLicenseNumber: true },
  },
  memberships: {
    where: { status: 'ACTIVE' },
    include: { roles: true, farm: { select: { id: true, name: true, status: true } } },
    orderBy: { createdAt: 'asc' },
  },
};
const loadUserContext = (userId) =>
  prisma.user.findUnique({ where: { id: userId }, include: authorizationInclude });
const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: env.NODE_ENV === 'production',
  path: '/api/v1/auth',
  maxAge: env.REFRESH_TOKEN_TTL_DAYS * 86_400_000,
};

async function issueSession(user, response, familyId = crypto.randomUUID()) {
  const raw = crypto.randomBytes(48).toString('base64url');
  const record = await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: tokenHash(raw),
      familyId,
      expiresAt: new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 86_400_000),
    },
  });
  response.cookie(cookieName, `${record.id}.${raw}`, cookieOptions);
  return signAccessToken(user.id);
}

export const authRouter = Router();
authRouter.post(
  '/register',
  validate(registerSchema),
  asyncHandler(async (request, response) => {
    if (await prisma.user.findUnique({ where: { email: request.body.email } }))
      throw new AppError(409, 'EMAIL_IN_USE', 'Email is already registered');
    if (
      request.body.phone &&
      (await prisma.user.findUnique({ where: { phone: request.body.phone } }))
    )
      throw new AppError(409, 'PHONE_IN_USE', 'Phone number is already registered');

    const passwordHash = await argon2.hash(request.body.password, { type: argon2.argon2id });
    const hasRole = Boolean(request.body.role);
    const initialStatus = hasRole ? 'PENDING_VERIFICATION' : 'ACTIVE';

    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email: request.body.email,
          phone: request.body.phone,
          fullName: request.body.fullName,
          passwordHash,
          status: initialStatus,
          pendingRole: request.body.role || null,
        },
        include: { platformRoles: true },
      });
      await appendAudit(
        {
          actorUserId: created.id,
          action: 'USER_REGISTERED',
          entityType: 'User',
          entityId: created.id,
          requestId: request.id,
          newData: { role: request.body.role || null, status: initialStatus },
        },
        tx,
      );
      return created;
    });

    if (hasRole) {
      const verificationToken = signVerificationToken(user.id, request.body.role);
      return response.status(201).json({
        data: {
          user: {
            id: user.id,
            email: user.email,
            phone: user.phone,
            fullName: user.fullName,
            status: user.status,
            role: request.body.role,
          },
          verificationToken,
          requiresVerification: true,
          redirectTo: '/verify',
        },
      });
    }

    const contextUser = await loadUserContext(user.id);
    response.status(201).json({
      data: { user: publicUser(contextUser), accessToken: await issueSession(user, response) },
    });
  }),
);

authRouter.post(
  '/verification/submit',
  authenticateVerificationToken,
  asyncHandler(async (request, response) => {
    const user = request.verificationUser;
    const role = request.body.role || request.verificationRole || user.pendingRole;
    if (!role || !['VETERINARIAN', 'FARMER', 'DAIRY_OWNER'].includes(role)) {
      throw new AppError(400, 'INVALID_ROLE', 'Valid user role is required for verification');
    }

    await prisma.$transaction(async (tx) => {
      if (role === 'VETERINARIAN') {
        const {
          qualification,
          registrationCouncil,
          registrationNumber,
          specialization,
          experienceYears,
          state,
          district,
          taluka,
          pincode,
          documentName,
          documentData,
        } = request.body;
        if (!registrationNumber || !registrationCouncil || !qualification || !state) {
          throw new AppError(400, 'MISSING_FIELDS', 'Required veterinarian fields missing');
        }
        await tx.veterinarianProfile.upsert({
          where: { userId: user.id },
          create: {
            userId: user.id,
            qualification,
            registrationCouncil,
            registrationNumber,
            specialization: specialization || null,
            experienceYears: experienceYears ? Number(experienceYears) : null,
            status: 'PENDING',
            documentName: documentName || null,
            documentData: documentData || null,
            serviceAreas: {
              create: [{ state, district: district || null, taluka: taluka || null, pincode: pincode || null }],
            },
          },
          update: {
            qualification,
            registrationCouncil,
            registrationNumber,
            specialization: specialization || null,
            experienceYears: experienceYears ? Number(experienceYears) : null,
            status: 'PENDING',
            documentName: documentName || null,
            documentData: documentData || null,
            serviceAreas: {
              deleteMany: {},
              create: [{ state, district: district || null, taluka: taluka || null, pincode: pincode || null }],
            },
          },
        });
      } else if (role === 'FARMER') {
        const {
          farmName,
          farmerIdNumber,
          state,
          district,
          taluka,
          pincode,
          totalCattle,
          documentName,
          documentData,
        } = request.body;
        if (!farmName || !state || !district) {
          throw new AppError(400, 'MISSING_FIELDS', 'Required farmer fields missing (farmName, state, district)');
        }
        let farm = await tx.farm.findFirst({ where: { createdById: user.id } });
        if (!farm) {
          farm = await tx.farm.create({
            data: {
              name: farmName,
              state,
              district,
              taluka: taluka || null,
              pincode: pincode || null,
              status: 'PENDING',
              createdById: user.id,
            },
          });
          await tx.farmMember.create({
            data: {
              farmId: farm.id,
              userId: user.id,
              status: 'INVITED',
              roles: { create: [{ role: 'FARM_OWNER' }, { role: 'FARM_MANAGER' }] },
            },
          });
        }
        await tx.farmerProfile.upsert({
          where: { userId: user.id },
          create: {
            userId: user.id,
            farmerIdNumber: farmerIdNumber || null,
            farmName,
            state,
            district,
            taluka: taluka || null,
            pincode: pincode || null,
            totalCattle: totalCattle ? Number(totalCattle) : 0,
            documentName: documentName || null,
            documentData: documentData || null,
            status: 'PENDING',
            farmId: farm.id,
          },
          update: {
            farmerIdNumber: farmerIdNumber || null,
            farmName,
            state,
            district,
            taluka: taluka || null,
            pincode: pincode || null,
            totalCattle: totalCattle ? Number(totalCattle) : 0,
            documentName: documentName || null,
            documentData: documentData || null,
            status: 'PENDING',
            farmId: farm.id,
          },
        });
      } else if (role === 'DAIRY_OWNER') {
        const {
          dairyName,
          fssaiLicenseNumber,
          state,
          district,
          operationalArea,
          dailyCapacityLiters,
          documentName,
          documentData,
        } = request.body;
        if (!dairyName || !fssaiLicenseNumber || !state || !district) {
          throw new AppError(400, 'MISSING_FIELDS', 'Required dairy fields missing (dairyName, fssaiLicenseNumber, state, district)');
        }
        await tx.dairyOwnerProfile.upsert({
          where: { userId: user.id },
          create: {
            userId: user.id,
            dairyName,
            fssaiLicenseNumber,
            state,
            district,
            operationalArea: operationalArea || null,
            dailyCapacityLiters: dailyCapacityLiters ? Number(dailyCapacityLiters) : 0,
            documentName: documentName || null,
            documentData: documentData || null,
            status: 'PENDING',
          },
          update: {
            dairyName,
            fssaiLicenseNumber,
            state,
            district,
            operationalArea: operationalArea || null,
            dailyCapacityLiters: dailyCapacityLiters ? Number(dailyCapacityLiters) : 0,
            documentName: documentName || null,
            documentData: documentData || null,
            status: 'PENDING',
          },
        });
      }

      await tx.user.update({
        where: { id: user.id },
        data: { pendingRole: role, status: 'PENDING_VERIFICATION' },
      });

      await appendAudit(
        {
          actorUserId: user.id,
          action: 'USER_VERIFICATION_SUBMITTED',
          entityType: 'User',
          entityId: user.id,
          requestId: request.id,
          newData: { role, submittedAt: new Date().toISOString() },
        },
        tx,
      );
    });

    response.json({
      data: {
        success: true,
        message:
          'Verification submitted successfully. Your account is pending administrator validation before login is allowed.',
        status: 'PENDING_VERIFICATION',
        role,
      },
    });
  }),
);

authRouter.post(
  '/login',
  validate(credentialsSchema),
  asyncHandler(async (request, response) => {
    const user = await prisma.user.findUnique({
      where: { email: request.body.email },
      include: authorizationInclude,
    });
    if (!user || !(await argon2.verify(user.passwordHash, request.body.password)))
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect');

    if (user.status === 'PENDING_VERIFICATION') {
      const hasSubmitted = Boolean(
        user.veterinarian?.id || user.farmerProfile?.id || user.dairyOwnerProfile?.id,
      );
      const verificationToken = signVerificationToken(user.id, user.pendingRole || 'FARMER');
      return response.status(403).json({
        error: {
          code: 'PENDING_VERIFICATION',
          message: hasSubmitted
            ? 'Your account verification is pending administrator review. Once approved, you will be able to log in.'
            : 'Your account registration is incomplete. Please submit your profile verification details for administrator review.',
        },
        data: {
          requiresVerification: !hasSubmitted,
          alreadySubmitted: hasSubmitted,
          verificationToken,
          user: publicUser(user),
          role: user.pendingRole || 'FARMER',
        },
      });
    }

    if (user.status !== 'ACTIVE') {
      throw new AppError(403, 'ACCOUNT_INACTIVE', 'Your account is currently disabled or suspended.');
    }

    response.json({
      data: { user: publicUser(user), accessToken: await issueSession(user, response) },
    });
  }),
);
authRouter.post(
  '/refresh',
  asyncHandler(async (request, response) => {
    const [id, raw] = (request.cookies[cookieName] || '').split('.');
    const record = id
      ? await prisma.refreshToken.findUnique({
          where: { id },
          include: { user: { include: { platformRoles: true } } },
        })
      : null;
    if (!record || !raw || record.tokenHash !== tokenHash(raw) || record.expiresAt <= new Date())
      throw new AppError(401, 'INVALID_REFRESH_TOKEN', 'Refresh token is invalid');
    if (record.revokedAt) {
      await prisma.refreshToken.updateMany({
        where: { familyId: record.familyId, revokedAt: null },
        data: { revokedAt: new Date(), revocationReason: 'REUSE_DETECTED' },
      });
      throw new AppError(401, 'REFRESH_TOKEN_REUSED', 'Refresh token reuse detected');
    }
    const nextRaw = crypto.randomBytes(48).toString('base64url');
    const next = await prisma.$transaction(async (tx) => {
      const created = await tx.refreshToken.create({
        data: {
          userId: record.userId,
          tokenHash: tokenHash(nextRaw),
          familyId: record.familyId,
          expiresAt: new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 86_400_000),
        },
      });
      await tx.refreshToken.update({
        where: { id: record.id },
        data: {
          revokedAt: new Date(),
          revocationReason: 'ROTATED',
          replacedBy: created.id,
          lastUsedAt: new Date(),
        },
      });
      return created;
    });
    response.cookie(cookieName, `${next.id}.${nextRaw}`, cookieOptions);
    response.json({
      data: {
        accessToken: signAccessToken(record.userId),
        user: publicUser(await loadUserContext(record.userId)),
      },
    });
  }),
);
authRouter.post(
  '/logout',
  asyncHandler(async (request, response) => {
    const [id] = (request.cookies[cookieName] || '').split('.');
    if (id)
      await prisma.refreshToken.updateMany({
        where: { id, revokedAt: null },
        data: { revokedAt: new Date(), revocationReason: 'LOGOUT' },
      });
    response.clearCookie(cookieName, cookieOptions);
    response.status(204).send();
  }),
);
authRouter.get(
  '/me',
  authenticate,
  asyncHandler(async (request, response) =>
    response.json({ data: { user: publicUser(await loadUserContext(request.principal.user.id)) } }),
  ),
);
authRouter.patch(
  '/profile',
  authenticate,
  validate(
    z.object({
      fullName: z.string().trim().min(2).max(160).optional(),
      phone: optionalTrimmedString(z.string().trim().min(7).max(32)),
      currentPassword: z.string().optional(),
      newPassword: z.string().min(10).max(128).optional(),
    }),
  ),
  asyncHandler(async (request, response) => {
    const user = await prisma.user.findUnique({ where: { id: request.principal.user.id } });
    if (!user) throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
    const dataToUpdate = {};
    if (request.body.fullName) dataToUpdate.fullName = request.body.fullName;
    if (request.body.phone !== undefined) dataToUpdate.phone = request.body.phone;
    if (request.body.newPassword) {
      if (!request.body.currentPassword)
        throw new AppError(
          400,
          'CURRENT_PASSWORD_REQUIRED',
          'Current password required to change password',
        );
      const valid = await argon2.verify(user.passwordHash, request.body.currentPassword);
      if (!valid)
        throw new AppError(400, 'INVALID_CURRENT_PASSWORD', 'Current password is incorrect');
      dataToUpdate.passwordHash = await argon2.hash(request.body.newPassword, {
        type: argon2.argon2id,
      });
    }
    await prisma.user.update({
      where: { id: user.id },
      data: dataToUpdate,
    });
    const updated = await loadUserContext(user.id);
    response.json({ data: { user: publicUser(updated) } });
  }),
);
