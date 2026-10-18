import crypto from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireFarmAccess } from '../../common/auth.js';
import { AppError, asyncHandler } from '../../common/errors.js';
import { validate } from '../../common/validation.js';
import { prisma } from '../../infrastructure/prisma/client.js';
import { appendAudit } from '../audit/index.js';
import { animalQrDataUrl, animalVerificationUrl, renderAnimalTagPdf } from './pdf.js';

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
      const verificationId = `anm_${crypto.randomBytes(16).toString('base64url')}`;
      const created = await tx.animal.create({
        data: { ...request.body, farmId: request.params.farmId, verificationId },
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
  animalsRouter.post(
    '/resolve-tag',
    validate(z.object({ tagInput: z.string().trim().min(1) })),
    asyncHandler(async (request, response) => {
      await requireFarmAccess(request.principal.user.id, request.params.farmId);
      const { tagInput } = request.body;
      let lookupId = tagInput;
      const urlMatch = tagInput.match(/\/verify\/animal\/([^/?#]+)/);
      if (urlMatch) {
        lookupId = urlMatch[1];
      }
      const animal = await prisma.animal.findFirst({
        where: {
          farmId: request.params.farmId,
          status: 'ACTIVE',
          OR: [
            { verificationId: lookupId },
            { tagNumber: lookupId },
            { id: lookupId },
            { name: lookupId },
          ],
        },
        include: { species: true, breed: true },
      });
      if (!animal) {
        return response.status(404).json({
          error: {
            code: 'ANIMAL_NOT_FOUND',
            message:
              'No active animal matching this tag, QR code, or identifier was found on this farm. Cross-farm access is prevented.',
            requestId: request.id,
          },
        });
      }
      response.json({
        data: {
          animal: {
            id: animal.id,
            tagNumber: animal.tagNumber,
            name: animal.name,
            species: animal.species?.canonicalName,
            speciesId: animal.speciesId,
            breed: animal.breed?.name,
            breedId: animal.breedId,
            verificationId: animal.verificationId,
            lactating: animal.lactating,
            sex: animal.sex,
          },
        },
      });
    }),
  );
  animalsRouter.get(
    '/:animalId/qr-tag',
    asyncHandler(async (request, response) => {
      await requireFarmAccess(request.principal.user.id, request.params.farmId);
      const animal = await prisma.animal.findFirst({
        where: { id: request.params.animalId, farmId: request.params.farmId },
        include: { species: true, breed: true, farm: true },
      });
      if (!animal) throw new AppError(404, 'ANIMAL_NOT_FOUND', 'Animal not found');
      let verificationId = animal.verificationId;
      if (!verificationId) {
        verificationId = `anm_${crypto.randomBytes(16).toString('base64url')}`;
        await prisma.animal.update({
          where: { id: animal.id },
          data: { verificationId },
        });
      }
      const qr = await animalQrDataUrl(verificationId);
      const url = animalVerificationUrl(verificationId);
      response.json({
        data: {
          animalId: animal.id,
          tagNumber: animal.tagNumber,
          name: animal.name,
          species: animal.species?.canonicalName,
          farmName: animal.farm?.name,
          verificationId,
          verificationUrl: url,
          qrDataUrl: qr,
        },
      });
    }),
  );
  animalsRouter.get(
    '/:animalId/tag-pdf',
    asyncHandler(async (request, response) => {
      await requireFarmAccess(request.principal.user.id, request.params.farmId);
      const animal = await prisma.animal.findFirst({
        where: { id: request.params.animalId, farmId: request.params.farmId },
        include: { species: true, breed: true, farm: true },
      });
      if (!animal) throw new AppError(404, 'ANIMAL_NOT_FOUND', 'Animal not found');
      let verificationId = animal.verificationId;
      if (!verificationId) {
        verificationId = `anm_${crypto.randomBytes(16).toString('base64url')}`;
        await prisma.animal.update({
          where: { id: animal.id },
          data: { verificationId },
        });
      }
      const pdf = await renderAnimalTagPdf({ animal, verificationId });
      await appendAudit({
        actorUserId: request.principal.user.id,
        action: 'ANIMAL_TAG_PDF_GENERATED',
        entityType: 'Animal',
        entityId: animal.id,
        farmId: request.params.farmId,
      });
      response
        .set({
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="Animal-Tag-${animal.tagNumber}.pdf"`,
        })
        .send(pdf);
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
