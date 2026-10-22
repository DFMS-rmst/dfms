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
    const applicableAnimals = await prisma.animal.findMany({
      where: {
        farmId: { in: farmIds },
        lactating: true,
        status: 'ACTIVE',
      },
      select: { id: true },
    });
    for (const animal of applicableAnimals)
      await evaluateAndPersist(animal.id, 'CURRENT_LIST_READ', req.principal.user.id);
    const checks = await prisma.milkEligibilityCheck.findMany({
      where: {
        farmId: { in: farmIds },
        isCurrent: true,
        ...(statuses ? { status: { in: statuses } } : {}),
      },
      include: {
        animal: { include: { species: true, farm: true } },
        treatmentEvaluations: {
          include: {
            treatment: true,
            medicine: true,
          },
        },
      },
      orderBy: { evaluatedAt: 'desc' },
    });
    const formatted = checks.map((c) => ({
      ...c,
      treatmentEvaluations: (c.treatmentEvaluations || []).map((te) => ({
        ...te,
        medicineName: te.medicine?.medicineName || te.ruleSnapshot?.medicineName || 'Medicine',
      })),
    }));
    res.json({ data: { eligibility: formatted } });
  }),
);
eligibilityRouter.get(
  '/animals/:animalId',
  asyncHandler(async (req, res) => {
    await authorizeAnimal(req, req.params.animalId);
    await evaluateAndPersist(req.params.animalId, 'CURRENT_DETAIL_READ', req.principal.user.id);
    const check = await prisma.milkEligibilityCheck.findFirst({
      where: { animalId: req.params.animalId, isCurrent: true },
      include: {
        treatmentEvaluations: {
          include: {
            treatment: true,
            medicine: true,
          },
        },
      },
    });
    if (check) {
      check.treatmentEvaluations = (check.treatmentEvaluations || []).map((te) => ({
        ...te,
        medicineName: te.medicine?.medicineName || te.ruleSnapshot?.medicineName || 'Medicine',
      }));
    }
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
    const medicines = await prisma.medicine.findMany({
      orderBy: { medicineName: 'asc' },
    });
    const rules = medicines.map((m) => ({
      id: m.id,
      code: m.medicineName,
      medicineName: m.medicineName,
      durationValue: m.milkWithdrawalDays,
      durationUnit: 'DAY',
      jurisdiction: 'INDIA',
      verificationStatus: 'VERIFIED',
      medicine: m,
    }));
    res.json({ data: { rules } });
  }),
);
withdrawalRouter.post(
  '/rules',
  asyncHandler(async (req, res) => {
    res.status(200).json({ data: { message: 'Rule reference handled via Medicine catalog.' } });
  }),
);

export const mrlRouter = Router();
mrlRouter.use(authenticate);
mrlRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    res.json({
      data: {
        usageConstraint: 'REFERENCE_ONLY_NO_MEASUREMENT_AND_NO_WITHDRAWAL_DERIVATION',
        rules: [],
      },
    });
  }),
);
