import { Router } from 'express';
import { authenticate, requireFarmAccess } from '../../common/auth.js';
import { AppError, asyncHandler } from '../../common/errors.js';
import { prisma } from '../../infrastructure/prisma/client.js';
import { animalAmuFeatures, farmAmuFeatures } from './features.js';
import { inferRisk, predictAnimalRisk, checkMlHealth } from './client.js';
import {
  computeAnimalRiskDefaults,
  recordAnimalRiskAssessment,
  getAnimalRiskHistory,
  getLatestAnimalRisk,
  getCaseRiskAssessments,
} from './risk-service.js';

async function assertFarmScope(request, farmId) {
  if (request.principal.platformRoles.includes('PLATFORM_ADMIN')) return;
  const vetCase = await prisma.veterinaryCase.findFirst({
    where: { farmId, veterinarian: { userId: request.principal.user.id } },
  });
  if (!vetCase)
    await requireFarmAccess(request.principal.user.id, farmId, [
      'FARM_OWNER',
      'FARM_MANAGER',
      'FARM_WORKER',
    ]);
}

export const mlRouter = Router();

// ML microservice health & connectivity check
mlRouter.get(
  '/status',
  asyncHandler(async (request, response) => {
    const health = await checkMlHealth();
    response.json({ data: health });
  }),
);

mlRouter.use(authenticate);

// AMU pattern anomaly endpoints
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

// Raw ML model prediction endpoint (for testing or interactive preview in UI)
mlRouter.post(
  '/predict',
  asyncHandler(async (request, response) => {
    const result = await predictAnimalRisk(request.body);
    response.json({ data: result });
  }),
);

// Intelligent default parameters for an animal's risk form
mlRouter.get(
  '/animals/:animalId/risk-defaults',
  asyncHandler(async (request, response) => {
    const animal = await prisma.animal.findUnique({ where: { id: request.params.animalId } });
    if (!animal) throw new AppError(404, 'ANIMAL_NOT_FOUND', 'Animal not found');
    await assertFarmScope(request, animal.farmId);
    const result = await computeAnimalRiskDefaults(animal.id);
    response.json({ data: result });
  }),
);

// Veterinarian enters treatment details & records an official risk assessment report
mlRouter.post(
  '/animals/:animalId/risk-assessment',
  asyncHandler(async (request, response) => {
    const animal = await prisma.animal.findUnique({ where: { id: request.params.animalId } });
    if (!animal) throw new AppError(404, 'ANIMAL_NOT_FOUND', 'Animal not found');

    const isPlatformAdmin = request.principal.platformRoles.includes('PLATFORM_ADMIN');
    const vetProfile = await prisma.veterinarianProfile.findUnique({
      where: { userId: request.principal.user.id },
    });

    if (!isPlatformAdmin && (!vetProfile || vetProfile.status !== 'VERIFIED')) {
      throw new AppError(
        403,
        'VERIFIED_VETERINARIAN_REQUIRED',
        'Only verified veterinarians or platform administrators can record clinical animal risk assessments',
      );
    }

    const assessment = await recordAnimalRiskAssessment({
      animalId: animal.id,
      caseId: request.body.caseId || null,
      userId: request.principal.user.id,
      data: request.body,
    });

    response.status(201).json({ data: { assessment } });
  }),
);

// Risk assessment history for an animal (accessible to farm owner/manager and vet)
mlRouter.get(
  '/animals/:animalId/risk-assessments',
  asyncHandler(async (request, response) => {
    const animal = await prisma.animal.findUnique({ where: { id: request.params.animalId } });
    if (!animal) throw new AppError(404, 'ANIMAL_NOT_FOUND', 'Animal not found');
    await assertFarmScope(request, animal.farmId);
    const assessments = await getAnimalRiskHistory(animal.id);
    response.json({ data: { assessments } });
  }),
);

// Latest risk assessment for an animal
mlRouter.get(
  '/animals/:animalId/latest-risk',
  asyncHandler(async (request, response) => {
    const animal = await prisma.animal.findUnique({ where: { id: request.params.animalId } });
    if (!animal) throw new AppError(404, 'ANIMAL_NOT_FOUND', 'Animal not found');
    await assertFarmScope(request, animal.farmId);
    const latest = await getLatestAnimalRisk(animal.id);
    response.json({ data: { assessment: latest } });
  }),
);

// Risk assessments associated with a specific veterinary case
mlRouter.get(
  '/cases/:caseId/risk-assessments',
  asyncHandler(async (request, response) => {
    const vetCase = await prisma.veterinaryCase.findUnique({
      where: { id: request.params.caseId },
    });
    if (!vetCase) throw new AppError(404, 'CASE_NOT_FOUND', 'Veterinary case not found');
    await assertFarmScope(request, vetCase.farmId);
    const assessments = await getCaseRiskAssessments(vetCase.id);
    response.json({ data: { assessments } });
  }),
);
