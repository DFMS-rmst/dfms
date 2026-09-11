import { Router } from 'express';
import { authenticate, requireFarmAccess, requirePlatformRole } from '../../common/auth.js';
import { AppError, asyncHandler } from '../../common/errors.js';
import { prisma } from '../../infrastructure/prisma/client.js';
import { aggregateAmu, getAmuDataset, groupAmu, monthlyTrend } from '../amu/service.js';

async function common(farmIds) {
  const rows = await getAmuDataset({ farmIds });
  const [
    animals,
    requestActive,
    casesOpen,
    treatmentActive,
    currentEligibility,
    certificates,
    alerts,
  ] = await Promise.all([
    prisma.animal.count({ where: { farmId: { in: farmIds }, status: 'ACTIVE' } }),
    prisma.treatmentRequest.count({
      where: {
        farmId: { in: farmIds },
        status: { in: ['OPEN', 'REQUESTED', 'ACCEPTED', 'IN_PROGRESS'] },
      },
    }),
    prisma.veterinaryCase.count({
      where: { farmId: { in: farmIds }, status: { notIn: ['COMPLETED', 'CANCELLED'] } },
    }),
    prisma.treatment.count({
      where: { farmId: { in: farmIds }, status: { in: ['PLANNED', 'ACTIVE'] } },
    }),
    prisma.milkEligibilityCheck.groupBy({
      by: ['status'],
      where: { farmId: { in: farmIds }, isCurrent: true },
      _count: true,
    }),
    prisma.milkEligibilityCertificate.groupBy({
      by: ['status'],
      where: { farmId: { in: farmIds } },
      _count: true,
    }),
    prisma.alert.findMany({
      where: { farmId: { in: farmIds } },
      take: 10,
      orderBy: { createdAt: 'desc' },
    }),
  ]);
  return {
    animals,
    activeTreatmentRequests: requestActive,
    openCases: casesOpen,
    activeTreatments: treatmentActive,
    eligibility: Object.fromEntries(currentEligibility.map((x) => [x.status, x._count])),
    certificates: Object.fromEntries(certificates.map((x) => [x.status, x._count])),
    amu: aggregateAmu(rows, animals),
    monthlyAmu: monthlyTrend(rows),
    recentAlerts: alerts,
  };
}

export const dashboardsRouter = Router();
dashboardsRouter.use(authenticate);
dashboardsRouter.get(
  '/farm',
  asyncHandler(async (req, res) => {
    await requireFarmAccess(req.principal.user.id, String(req.query.farmId), [
      'FARM_OWNER',
      'FARM_MANAGER',
    ]);
    res.json({ data: await common([String(req.query.farmId)]) });
  }),
);
dashboardsRouter.get(
  '/veterinarian',
  requirePlatformRole('VETERINARIAN'),
  asyncHandler(async (req, res) => {
    const vet = await prisma.veterinarianProfile.findUnique({
      where: { userId: req.principal.user.id },
    });
    if (!vet)
      throw new AppError(403, 'VETERINARIAN_PROFILE_REQUIRED', 'Veterinarian profile required');
    if (vet.status !== 'VERIFIED')
      return res.json({
        data: {
          veterinarianStatus: vet.status,
          clinicalAccess: false,
          pendingRequests: 0,
          followUpCases: 0,
        },
      });
    const cases = vet
      ? await prisma.veterinaryCase.findMany({
          where: { veterinarianId: vet.id },
          select: { farmId: true },
        })
      : [];
    const farmIds = [...new Set(cases.map((x) => x.farmId))];
    const data = await common(farmIds);
    data.pendingRequests = vet
      ? await prisma.treatmentRequest.count({
          where: { requestedVeterinarianId: vet.id, status: 'REQUESTED' },
        })
      : 0;
    data.followUpCases = vet
      ? await prisma.veterinaryCase.count({
          where: { veterinarianId: vet.id, status: 'FOLLOW_UP' },
        })
      : 0;
    res.json({ data });
  }),
);
dashboardsRouter.get(
  '/admin',
  requirePlatformRole('PLATFORM_ADMIN'),
  asyncHandler(async (_req, res) => {
    const farms = await prisma.farm.findMany({ select: { id: true } });
    const farmIds = farms.map((x) => x.id);
    const data = await common(farmIds);
    const rows = await getAmuDataset({ farmIds });
    Object.assign(data, {
      farms: farms.length,
      registeredVeterinarians: await prisma.veterinarianProfile.count(),
      pendingVeterinarians: await prisma.veterinarianProfile.count({
        where: { status: 'PENDING' },
      }),
      verifiedVeterinarians: await prisma.veterinarianProfile.count({
        where: { status: 'VERIFIED' },
      }),
      antimicrobialAdministrations: rows.length,
      usageByClass: groupAmu(rows, 'class'),
      usageByFarm: groupAmu(rows, 'farm'),
      anchorHealth: Object.fromEntries(
        (await prisma.blockchainAnchor.groupBy({ by: ['status'], _count: true })).map((x) => [
          x.status,
          x._count,
        ]),
      ),
      referenceReviewCases: await prisma.withdrawalRule.count({
        where: { verificationStatus: { not: 'VERIFIED' } },
      }),
      recentAudit: await prisma.auditLog.findMany({ take: 10, orderBy: { createdAt: 'desc' } }),
    });
    res.json({ data });
  }),
);
