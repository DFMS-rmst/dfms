import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requirePlatformRole } from '../../common/auth.js';
import { AppError, asyncHandler } from '../../common/errors.js';
import { validate } from '../../common/validation.js';
import { prisma } from '../../infrastructure/prisma/client.js';
import { appendAudit } from '../audit/index.js';

const reviewSchema = z.object({
  status: z.enum(['VERIFIED', 'REJECTED', 'SUSPENDED']),
  reviewNotes: z.string().trim().max(3000).optional().nullable(),
});

const vetInclude = {
  user: {
    select: { id: true, fullName: true, email: true, phone: true, status: true, createdAt: true },
  },
  serviceAreas: true,
  documents: {
    select: {
      id: true,
      mimeType: true,
      sizeBytes: true,
      status: true,
      purpose: true,
      createdAt: true,
    },
  },
};

const farmerInclude = {
  user: {
    select: { id: true, fullName: true, email: true, phone: true, status: true, createdAt: true },
  },
};

const dairyOwnerInclude = {
  user: {
    select: { id: true, fullName: true, email: true, phone: true, status: true, createdAt: true },
  },
};

export const adminVerificationsRouter = Router();
adminVerificationsRouter.use(authenticate, requirePlatformRole('PLATFORM_ADMIN'));

adminVerificationsRouter.get(
  '/',
  asyncHandler(async (request, response) => {
    const status = request.query.status || 'PENDING';
    const type = request.query.type || 'ALL';

    const result = {
      veterinarians: [],
      farmers: [],
      dairyOwners: [],
    };

    if (type === 'ALL' || type === 'VETERINARIAN') {
      result.veterinarians = await prisma.veterinarianProfile.findMany({
        where: status !== 'ALL' ? { status } : {},
        include: vetInclude,
        orderBy: { updatedAt: 'desc' },
      });
    }

    if (type === 'ALL' || type === 'FARMER') {
      result.farmers = await prisma.farmerProfile.findMany({
        where: status !== 'ALL' ? { status } : {},
        include: farmerInclude,
        orderBy: { updatedAt: 'desc' },
      });
    }

    if (type === 'ALL' || type === 'DAIRY_OWNER') {
      result.dairyOwners = await prisma.dairyOwnerProfile.findMany({
        where: status !== 'ALL' ? { status } : {},
        include: dairyOwnerInclude,
        orderBy: { updatedAt: 'desc' },
      });
    }

    response.json({ data: result });
  }),
);

adminVerificationsRouter.patch(
  '/:type/:id',
  validate(reviewSchema),
  asyncHandler(async (request, response) => {
    const { type, id } = request.params;
    const { status, reviewNotes } = request.body;

    if (type === 'veterinarians' || type === 'veterinarian') {
      const before = await prisma.veterinarianProfile.findUnique({ where: { id } });
      if (!before) throw new AppError(404, 'NOT_FOUND', 'Veterinarian profile not found');

      const updated = await prisma.$transaction(async (tx) => {
        const prof = await tx.veterinarianProfile.update({
          where: { id },
          data: {
            status,
            reviewNotes: reviewNotes || null,
            reviewedById: request.principal.user.id,
            reviewedAt: new Date(),
          },
          include: vetInclude,
        });

        if (status === 'VERIFIED') {
          await tx.user.update({
            where: { id: prof.userId },
            data: { status: 'ACTIVE' },
          });
          await tx.userPlatformRole.upsert({
            where: { userId_role: { userId: prof.userId, role: 'VETERINARIAN' } },
            create: { userId: prof.userId, role: 'VETERINARIAN' },
            update: {},
          });
        }

        await appendAudit(
          {
            actorUserId: request.principal.user.id,
            action: `VETERINARIAN_${status}`,
            entityType: 'VeterinarianProfile',
            entityId: id,
            requestId: request.id,
            previousData: { status: before.status },
            newData: { status: prof.status, reviewNotes: prof.reviewNotes },
          },
          tx,
        );

        return prof;
      });

      return response.json({ data: { profile: updated, type: 'VETERINARIAN' } });
    }

    if (type === 'farmers' || type === 'farmer') {
      const before = await prisma.farmerProfile.findUnique({ where: { id } });
      if (!before) throw new AppError(404, 'NOT_FOUND', 'Farmer profile not found');

      const updated = await prisma.$transaction(async (tx) => {
        const prof = await tx.farmerProfile.update({
          where: { id },
          data: {
            status,
            reviewNotes: reviewNotes || null,
            reviewedById: request.principal.user.id,
            reviewedAt: new Date(),
          },
          include: farmerInclude,
        });

        if (status === 'VERIFIED') {
          await tx.user.update({
            where: { id: prof.userId },
            data: { status: 'ACTIVE' },
          });
          await tx.userPlatformRole.upsert({
            where: { userId_role: { userId: prof.userId, role: 'FARMER' } },
            create: { userId: prof.userId, role: 'FARMER' },
            update: {},
          });

          if (prof.farmId) {
            await tx.farm.update({
              where: { id: prof.farmId },
              data: { status: 'ACTIVE' },
            });
            await tx.farmMember.updateMany({
              where: { farmId: prof.farmId, userId: prof.userId },
              data: { status: 'ACTIVE', joinedAt: new Date() },
            });
          }
        }

        await appendAudit(
          {
            actorUserId: request.principal.user.id,
            action: `FARMER_${status}`,
            entityType: 'FarmerProfile',
            entityId: id,
            requestId: request.id,
            previousData: { status: before.status },
            newData: { status: prof.status, reviewNotes: prof.reviewNotes },
          },
          tx,
        );

        return prof;
      });

      return response.json({ data: { profile: updated, type: 'FARMER' } });
    }

    if (type === 'dairy-owners' || type === 'dairy_owner' || type === 'dairyOwner') {
      const before = await prisma.dairyOwnerProfile.findUnique({ where: { id } });
      if (!before) throw new AppError(404, 'NOT_FOUND', 'Dairy owner profile not found');

      const updated = await prisma.$transaction(async (tx) => {
        const prof = await tx.dairyOwnerProfile.update({
          where: { id },
          data: {
            status,
            reviewNotes: reviewNotes || null,
            reviewedById: request.principal.user.id,
            reviewedAt: new Date(),
          },
          include: dairyOwnerInclude,
        });

        if (status === 'VERIFIED') {
          await tx.user.update({
            where: { id: prof.userId },
            data: { status: 'ACTIVE' },
          });
          await tx.userPlatformRole.upsert({
            where: { userId_role: { userId: prof.userId, role: 'DAIRY_OWNER' } },
            create: { userId: prof.userId, role: 'DAIRY_OWNER' },
            update: {},
          });
        }

        await appendAudit(
          {
            actorUserId: request.principal.user.id,
            action: `DAIRY_OWNER_${status}`,
            entityType: 'DairyOwnerProfile',
            entityId: id,
            requestId: request.id,
            previousData: { status: before.status },
            newData: { status: prof.status, reviewNotes: prof.reviewNotes },
          },
          tx,
        );

        return prof;
      });

      return response.json({ data: { profile: updated, type: 'DAIRY_OWNER' } });
    }

    throw new AppError(400, 'INVALID_TYPE', `Unknown verification type: ${type}`);
  }),
);
