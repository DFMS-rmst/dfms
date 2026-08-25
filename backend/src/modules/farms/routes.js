import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireFarmAccess } from '../../common/auth.js';
import { AppError, asyncHandler } from '../../common/errors.js';
import { validate } from '../../common/validation.js';
import { prisma } from '../../infrastructure/prisma/client.js';
import { appendAudit } from '../audit/index.js';

const farmSchema = z.object({
  name: z.string().trim().min(2).max(191),
  state: z.string().trim().min(2).max(100),
  district: z.string().trim().min(2).max(100),
  taluka: z.string().trim().max(100).optional().nullable(),
  pincode: z
    .string()
    .regex(/^\d{6}$/)
    .optional()
    .nullable(),
  timeZone: z.string().max(64).default('Asia/Kolkata'),
});
const memberSchema = z.object({
  email: z
    .string()
    .email()
    .transform((v) => v.toLowerCase()),
  roles: z
    .array(z.enum(['FARM_MANAGER', 'FARM_WORKER']))
    .min(1)
    .max(2),
});
const include = {
  members: {
    where: { status: 'ACTIVE' },
    include: { roles: true, user: { select: { id: true, fullName: true, email: true } } },
  },
};
export const farmsRouter = Router();
farmsRouter.use(authenticate);
farmsRouter.post(
  '/',
  validate(farmSchema),
  asyncHandler(async (request, response) => {
    const farm = await prisma.$transaction(async (tx) => {
      const created = await tx.farm.create({
        data: { ...request.body, status: 'ACTIVE', createdById: request.principal.user.id },
      });
      const member = await tx.farmMember.create({
        data: {
          farmId: created.id,
          userId: request.principal.user.id,
          status: 'ACTIVE',
          joinedAt: new Date(),
          roles: { create: [{ role: 'FARM_OWNER' }, { role: 'FARM_MANAGER' }] },
        },
        include: { roles: true },
      });
      await appendAudit(
        {
          actorUserId: request.principal.user.id,
          action: 'FARM_CREATED',
          entityType: 'Farm',
          entityId: created.id,
          farmId: created.id,
          requestId: request.id,
          newData: { name: created.name, roles: member.roles.map((r) => r.role) },
        },
        tx,
      );
      return created;
    });
    response.status(201).json({ data: { farm } });
  }),
);
farmsRouter.get(
  '/',
  asyncHandler(async (request, response) => {
    const farms = await prisma.farm.findMany({
      where: { members: { some: { userId: request.principal.user.id, status: 'ACTIVE' } } },
      include: {
        members: { where: { userId: request.principal.user.id }, include: { roles: true } },
        _count: { select: { animals: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    response.json({ data: { farms } });
  }),
);
farmsRouter.get(
  '/:farmId',
  asyncHandler(async (request, response) => {
    await requireFarmAccess(request.principal.user.id, request.params.farmId);
    const farm = await prisma.farm.findUnique({ where: { id: request.params.farmId }, include });
    response.json({ data: { farm } });
  }),
);
farmsRouter.patch(
  '/:farmId',
  validate(farmSchema.partial()),
  asyncHandler(async (request, response) => {
    await requireFarmAccess(request.principal.user.id, request.params.farmId, [
      'FARM_OWNER',
      'FARM_MANAGER',
    ]);
    const farm = await prisma.farm.update({
      where: { id: request.params.farmId },
      data: request.body,
    });
    response.json({ data: { farm } });
  }),
);
farmsRouter.get(
  '/:farmId/members',
  asyncHandler(async (request, response) => {
    await requireFarmAccess(request.principal.user.id, request.params.farmId);
    const members = await prisma.farmMember.findMany({
      where: { farmId: request.params.farmId, status: { not: 'REMOVED' } },
      include: { roles: true, user: { select: { id: true, fullName: true, email: true } } },
    });
    response.json({ data: { members } });
  }),
);
farmsRouter.post(
  '/:farmId/members',
  validate(memberSchema),
  asyncHandler(async (request, response) => {
    await requireFarmAccess(request.principal.user.id, request.params.farmId, ['FARM_OWNER']);
    const user = await prisma.user.findUnique({ where: { email: request.body.email } });
    if (!user) throw new AppError(404, 'USER_NOT_FOUND', 'Registered user not found');
    const member = await prisma.$transaction(async (tx) => {
      const saved = await tx.farmMember.upsert({
        where: { farmId_userId: { farmId: request.params.farmId, userId: user.id } },
        create: {
          farmId: request.params.farmId,
          userId: user.id,
          status: 'ACTIVE',
          joinedAt: new Date(),
          invitedById: request.principal.user.id,
        },
        update: { status: 'ACTIVE', joinedAt: new Date(), invitedById: request.principal.user.id },
      });
      await tx.farmMemberRole.deleteMany({
        where: { farmMemberId: saved.id, role: { not: 'FARM_OWNER' } },
      });
      await Promise.all(
        request.body.roles.map((role) =>
          tx.farmMemberRole.upsert({
            where: { farmMemberId_role: { farmMemberId: saved.id, role } },
            create: { farmMemberId: saved.id, role },
            update: {},
          }),
        ),
      );
      await appendAudit(
        {
          actorUserId: request.principal.user.id,
          action: 'FARM_ROLES_ASSIGNED',
          entityType: 'FarmMember',
          entityId: saved.id,
          farmId: request.params.farmId,
          requestId: request.id,
          newData: { roles: request.body.roles },
        },
        tx,
      );
      return tx.farmMember.findUnique({ where: { id: saved.id }, include: { roles: true } });
    });
    response.status(201).json({ data: { member } });
  }),
);
