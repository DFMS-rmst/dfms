import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireFarmAccess } from '../../common/auth.js';
import { AppError, asyncHandler } from '../../common/errors.js';
import { validate } from '../../common/validation.js';
import { prisma } from '../../infrastructure/prisma/client.js';
import { appendAudit } from '../audit/index.js';

const animalSchema = z.object({
  speciesId: z.string().min(1),
  breedId: z.string().optional().nullable(),
  tagNumber: z.string().trim().min(1).max(100),
  name: z.string().trim().max(120).optional().nullable(),
  sex: z.enum([
    'FEMALE',
    'MALE',
    'INTACT_FEMALE',
    'INTACT_MALE',
    'NEUTERED',
    'CASTRATED',
    'HERMAPHRODITE',
    'UNKNOWN',
  ]),
  dateOfBirth: z.coerce.date().max(new Date()).optional().nullable(),
  lactating: z.boolean().default(false),
  status: z.enum(['ACTIVE', 'SOLD', 'DECEASED', 'TRANSFERRED', 'INACTIVE']).default('ACTIVE'),
  notes: z.string().max(3000).optional().nullable(),
});
const details = {
  species: true,
  breed: true,
  profileEvents: { orderBy: { createdAt: 'desc' }, take: 20 },
};
export const speciesRouter = Router();
speciesRouter.get(
  '/',
  authenticate,
  asyncHandler(async (_request, response) =>
    response.json({
      data: { species: await prisma.species.findMany({ orderBy: { canonicalName: 'asc' } }) },
    }),
  ),
);
export const animalsRouter = Router({ mergeParams: true });
animalsRouter.use(authenticate);
animalsRouter.post(
  '/',
  validate(animalSchema),
  asyncHandler(async (request, response) => {
    await requireFarmAccess(request.principal.user.id, request.params.farmId, [
      'FARM_OWNER',
      'FARM_MANAGER',
    ]);
    const animal = await prisma.$transaction(async (tx) => {
      const created = await tx.animal.create({
        data: { ...request.body, farmId: request.params.farmId },
        include: { species: true, breed: true },
      });
      await tx.animalProfileEvent.create({
        data: {
          animalId: created.id,
          actorUserId: request.principal.user.id,
          eventType: 'CREATED',
          summary: 'Animal profile created',
        },
      });
      await appendAudit(
        {
          actorUserId: request.principal.user.id,
          action: 'ANIMAL_CREATED',
          entityType: 'Animal',
          entityId: created.id,
          farmId: request.params.farmId,
          requestId: request.id,
          newData: { tagNumber: created.tagNumber, speciesId: created.speciesId },
        },
        tx,
      );
      return created;
    });
    response.status(201).json({ data: { animal } });
  }),
);
animalsRouter.get(
  '/',
  asyncHandler(async (request, response) => {
    await requireFarmAccess(request.principal.user.id, request.params.farmId);
    response.json({
      data: {
        animals: await prisma.animal.findMany({
          where: { farmId: request.params.farmId },
          include: { species: true, breed: true },
          orderBy: { createdAt: 'desc' },
        }),
      },
    });
  }),
);
animalsRouter.get(
  '/:animalId',
  asyncHandler(async (request, response) => {
    await requireFarmAccess(request.principal.user.id, request.params.farmId);
    const animal = await prisma.animal.findFirst({
      where: { id: request.params.animalId, farmId: request.params.farmId },
      include: details,
    });
    if (!animal)
      return response.status(404).json({
        error: { code: 'ANIMAL_NOT_FOUND', message: 'Animal not found', requestId: request.id },
      });
    response.json({ data: { animal } });
  }),
);
animalsRouter.patch(
  '/:animalId',
  validate(animalSchema.partial()),
  asyncHandler(async (request, response) => {
    await requireFarmAccess(request.principal.user.id, request.params.farmId, [
      'FARM_OWNER',
      'FARM_MANAGER',
    ]);
    const existing = await prisma.animal.findFirst({
      where: { id: request.params.animalId, farmId: request.params.farmId },
    });
    if (!existing)
      return response.status(404).json({
        error: { code: 'ANIMAL_NOT_FOUND', message: 'Animal not found', requestId: request.id },
      });
    const animal = await prisma.$transaction(async (tx) => {
      const updated = await tx.animal.update({
        where: { id: existing.id },
        data: request.body,
        include: { species: true, breed: true },
      });
      await tx.animalProfileEvent.create({
        data: {
          animalId: updated.id,
          actorUserId: request.principal.user.id,
          eventType: 'UPDATED',
          summary: 'Animal profile updated',
          details: request.body,
        },
      });
      return updated;
    });
    response.json({ data: { animal } });
  }),
);
animalsRouter.get(
  '/:animalId/timeline',
  asyncHandler(async (request, response) => {
    await requireFarmAccess(request.principal.user.id, request.params.farmId);
    const animal = await prisma.animal.findFirst({
      where: { id: request.params.animalId, farmId: request.params.farmId },
    });
    if (!animal) throw new AppError(404, 'ANIMAL_NOT_FOUND', 'Animal not found');
    const events = await prisma.animalProfileEvent.findMany({
      where: { animalId: animal.id },
      orderBy: { createdAt: 'desc' },
    });
    response.json({ data: { events } });
  }),
);

animalsRouter.delete(
  '/:animalId',
  asyncHandler(async (request, response) => {
    await requireFarmAccess(request.principal.user.id, request.params.farmId, [
      'FARM_OWNER',
      'FARM_MANAGER',
    ]);
    const existing = await prisma.animal.findFirst({
      where: { id: request.params.animalId, farmId: request.params.farmId },
    });
    if (!existing)
      return response.status(404).json({
        error: { code: 'ANIMAL_NOT_FOUND', message: 'Animal not found', requestId: request.id },
      });

    try {
      await prisma.$transaction(async (tx) => {
        await tx.animalProfileEvent.deleteMany({ where: { animalId: existing.id } });
        await tx.animal.delete({ where: { id: existing.id } });
        await appendAudit(
          {
            actorUserId: request.principal.user.id,
            action: 'ANIMAL_DELETED',
            entityType: 'Animal',
            entityId: existing.id,
            farmId: request.params.farmId,
            requestId: request.id,
            previousData: { tagNumber: existing.tagNumber },
          },
          tx,
        );
      });
      response.json({ data: { success: true, animalId: existing.id } });
    } catch (err) {
      if (err.code === 'P2003') {
        throw new AppError(
          400,
          'ANIMAL_HAS_RECORDS',
          'Cannot delete animal with existing veterinary cases, treatments, or certificates. Archive or deactivate animal instead.',
        );
      }
      throw err;
    }
  }),
);
