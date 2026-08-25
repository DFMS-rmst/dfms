import crypto from 'node:crypto';
import argon2 from 'argon2';
import { Router } from 'express';
import { z } from 'zod';
import { env } from '../../config/env.js';
import { authenticate, signAccessToken } from '../../common/auth.js';
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
const registerSchema = credentialsSchema.extend({
  fullName: z.string().trim().min(2).max(160),
  phone: z.string().trim().min(7).max(32).optional(),
});
const cookieName = 'refresh_token';
const tokenHash = (token) => crypto.createHash('sha256').update(token).digest('hex');
const publicUser = (user) => ({
  id: user.id,
  email: user.email,
  phone: user.phone,
  fullName: user.fullName,
  status: user.status,
  platformRoles: (user.platformRoles || []).map((item) => item.role),
});
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
    const passwordHash = await argon2.hash(request.body.password, { type: argon2.argon2id });
    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email: request.body.email,
          phone: request.body.phone,
          fullName: request.body.fullName,
          passwordHash,
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
        },
        tx,
      );
      return created;
    });
    response
      .status(201)
      .json({ data: { user: publicUser(user), accessToken: await issueSession(user, response) } });
  }),
);
authRouter.post(
  '/login',
  validate(credentialsSchema),
  asyncHandler(async (request, response) => {
    const user = await prisma.user.findUnique({
      where: { email: request.body.email },
      include: { platformRoles: true },
    });
    if (
      !user ||
      user.status !== 'ACTIVE' ||
      !(await argon2.verify(user.passwordHash, request.body.password))
    )
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect');
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
      data: { accessToken: signAccessToken(record.userId), user: publicUser(record.user) },
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
authRouter.get('/me', authenticate, (request, response) =>
  response.json({ data: { user: publicUser(request.principal.user) } }),
);
