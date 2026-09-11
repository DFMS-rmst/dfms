import { Router } from 'express';
import { authenticate, requireFarmAccess } from '../../common/auth.js';
import { AppError, asyncHandler } from '../../common/errors.js';
import { prisma } from '../../infrastructure/prisma/client.js';
import { animalAmuFeatures, farmAmuFeatures } from './features.js';
import { inferRisk } from './client.js';

async function assertFarmScope(request, farmId) {
  if (request.principal.platformRoles.includes('PLATFORM_ADMIN')) return;
  const vetCase = await prisma.veterinaryCase.findFirst({
    where: { farmId, veterinarian: { userId: request.principal.user.id } },
  });
  if (!vetCase)
    await requireFarmAccess(request.principal.user.id, farmId, ['FARM_OWNER', 'FARM_MANAGER']);
}

export const mlRouter = Router();
mlRouter.use(authenticate);
mlRouter.get(
  '/animals/:animalId/amu-risk',
  asyncHandler(async (request, response) => {
    const animal = await prisma.animal.findUnique({ where: { id: request.params.animalId } });
    if (!animal) throw new AppError(404, 'ANIMAL_NOT_FOUND', 'Animal not found');
    await assertFarmScope(request, animal.farmId);
    const features = await animalAmuFeatures(animal.id);
    response.json({
      data: { scope: 'ANIMAL', animalId: animal.id, features, risk: await inferRisk(features) },
    });
  }),
);
mlRouter.get(
  '/farms/:farmId/amu-risk',
  asyncHandler(async (request, response) => {
    await assertFarmScope(request, request.params.farmId);
    const features = await farmAmuFeatures(request.params.farmId);
    response.json({
      data: {
        scope: 'FARM',
        farmId: request.params.farmId,
        features,
        risk: await inferRisk(features),
      },
    });
  }),
);
