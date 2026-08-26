import { Router } from 'express';
import { authenticate, requireFarmAccess } from '../../common/auth.js';
import { AppError, asyncHandler } from '../../common/errors.js';
import { prisma } from '../../infrastructure/prisma/client.js';
import { evaluateAndPersist } from '../withdrawal/service.js';

async function authorizeAnimal(req, animalId) {
  const animal = await prisma.animal.findUnique({
    where: { id: animalId },
    select: { id: true, farmId: true },
  });
  if (!animal) throw new AppError(404, 'ANIMAL_NOT_FOUND', 'Animal not found');
  if (req.principal.platformRoles.includes('PLATFORM_ADMIN')) return animal;
  try {
    await requireFarmAccess(req.principal.user.id, animal.farmId);
    return animal;
  } catch (error) {
    const assigned = await prisma.veterinaryCase.count({
      where: { animalId, veterinarian: { userId: req.principal.user.id } },
    });
    if (!assigned) throw error;
    return animal;
  }
}

export const eligibilityRouter = Router();
eligibilityRouter.use(authenticate);
eligibilityRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const admin = req.principal.platformRoles.includes('PLATFORM_ADMIN');
    let farmIds;
    if (req.query.farmId) {
      if (!admin) await requireFarmAccess(req.principal.user.id, req.query.farmId);
      farmIds = [req.query.farmId];
    } else if (admin)
      farmIds = (await prisma.farm.findMany({ select: { id: true } })).map((x) => x.id);
    else {
      const member = await prisma.farmMember.findMany({
        where: { userId: req.principal.user.id, status: 'ACTIVE' },
        select: { farmId: true },
      });
      const cases = await prisma.veterinaryCase.findMany({
        where: { veterinarian: { userId: req.principal.user.id } },
        select: { farmId: true },
      });
      farmIds = [...new Set([...member, ...cases].map((x) => x.farmId))];
    }
    const statuses = req.query.status ? String(req.query.status).split(',') : undefined;
    const missing = await prisma.animal.findMany({
      where: {
        farmId: { in: farmIds },
        lactating: true,
        status: 'ACTIVE',
        eligibilityChecks: { none: { isCurrent: true } },
      },
      select: { id: true },
    });
    for (const animal of missing)
      await evaluateAndPersist(animal.id, 'INITIAL_LIST_EVALUATION', req.principal.user.id);
    const checks = await prisma.milkEligibilityCheck.findMany({
      where: {
        farmId: { in: farmIds },
        isCurrent: true,
        ...(statuses ? { status: { in: statuses } } : {}),
      },
      include: {
        animal: { include: { species: true, farm: true } },
        treatmentEvaluations: {
          include: { treatment: true, drug: true, withdrawalRule: { include: { source: true } } },
        },
      },
      orderBy: { evaluatedAt: 'desc' },
    });
    res.json({ data: { eligibility: checks } });
  }),
);
eligibilityRouter.get(
  '/animals/:animalId',
  asyncHandler(async (req, res) => {
    await authorizeAnimal(req, req.params.animalId);
    let check = await prisma.milkEligibilityCheck.findFirst({
      where: { animalId: req.params.animalId, isCurrent: true },
      include: {
        treatmentEvaluations: {
          include: {
            treatment: true,
            drug: { include: { antimicrobialClass: true } },
            withdrawalRule: { include: { source: true } },
          },
        },
      },
    });
    if (!check)
      check = await evaluateAndPersist(req.params.animalId, 'INITIAL_READ', req.principal.user.id);
    res.json({ data: { eligibility: check } });
  }),
);
eligibilityRouter.post(
  '/animals/:animalId/evaluate',
  asyncHandler(async (req, res) => {
    await authorizeAnimal(req, req.params.animalId);
    const check = await evaluateAndPersist(
      req.params.animalId,
      'EXPLICIT_REEVALUATION',
      req.principal.user.id,
    );
    res.json({ data: { eligibility: check } });
  }),
);

export const withdrawalRouter = Router();
withdrawalRouter.use(authenticate);
withdrawalRouter.get(
  '/rules',
  asyncHandler(async (req, res) => {
    const rules = await prisma.withdrawalRule.findMany({
      where: {
        ...(req.query.drugId ? { drugId: req.query.drugId } : {}),
        ...(req.query.speciesId ? { speciesId: req.query.speciesId } : {}),
        foodProduct: 'MILK',
      },
      include: { drug: true, drugProduct: true, species: true, source: true },
      orderBy: [{ jurisdiction: 'asc' }, { code: 'asc' }],
    });
    res.json({ data: { rules } });
  }),
);

export const mrlRouter = Router();
mrlRouter.use(authenticate);
mrlRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const rules = await prisma.mrlReferenceRule.findMany({
      where: {
        ...(req.query.drugId ? { drugId: req.query.drugId } : {}),
        ...(req.query.speciesId ? { speciesId: req.query.speciesId } : {}),
        ...(req.query.foodProduct ? { foodProduct: req.query.foodProduct } : {}),
      },
      include: { drug: { include: { antimicrobialClass: true } }, species: true, source: true },
      orderBy: { code: 'asc' },
    });
    res.json({
      data: {
        usageConstraint: 'REFERENCE_ONLY_NO_MEASUREMENT_AND_NO_WITHDRAWAL_DERIVATION',
        rules,
      },
    });
  }),
);
