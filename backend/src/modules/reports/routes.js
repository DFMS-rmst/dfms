import { Router } from 'express';
import { authenticate, requireFarmAccess } from '../../common/auth.js';
import { AppError, asyncHandler } from '../../common/errors.js';
import { prisma } from '../../infrastructure/prisma/client.js';
import { aggregateAmu, getAmuDataset, groupAmu, monthlyTrend } from '../amu/service.js';

function csv(rows) {
  if (!rows.length) return '';
  const keys = Object.keys(rows[0]);
  const escape = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
  return [
    keys.map(escape).join(','),
    ...rows.map((row) =>
      keys
        .map((key) => escape(typeof row[key] === 'object' ? JSON.stringify(row[key]) : row[key]))
        .join(','),
    ),
  ].join('\n');
}
async function scope(req) {
  const admin = req.principal.platformRoles.includes('PLATFORM_ADMIN');
  if (req.query.farmId) {
    if (!admin) {
      const assigned = await prisma.veterinaryCase.count({
        where: {
          farmId: String(req.query.farmId),
          veterinarian: { userId: req.principal.user.id },
        },
      });
      if (!assigned)
        await requireFarmAccess(req.principal.user.id, String(req.query.farmId), [
          'FARM_OWNER',
          'FARM_MANAGER',
        ]);
    }
    return [String(req.query.farmId)];
  }
  if (admin) return (await prisma.farm.findMany({ select: { id: true } })).map((x) => x.id);
  const memberships = (
    await prisma.farmMember.findMany({
      where: {
        userId: req.principal.user.id,
        status: 'ACTIVE',
        roles: { some: { role: { in: ['FARM_OWNER', 'FARM_MANAGER'] } } },
      },
      select: { farmId: true },
    })
  ).map((x) => x.farmId);
  const cases = (
    await prisma.veterinaryCase.findMany({
      where: { veterinarian: { userId: req.principal.user.id } },
      select: { farmId: true },
    })
  ).map((x) => x.farmId);
  const farmIds = [...new Set([...memberships, ...cases])];
  if (!farmIds.length) throw new AppError(403, 'FORBIDDEN', 'Management report scope required');
  return farmIds;
}
export const reportsRouter = Router();
reportsRouter.use(authenticate);
reportsRouter.get(
  '/:type',
  asyncHandler(async (req, res) => {
    const farmIds = await scope(req);
    const start = req.query.start ? new Date(String(req.query.start)) : undefined;
    const end = req.query.end ? new Date(String(req.query.end)) : undefined;
    if (
      (start && Number.isNaN(start.valueOf())) ||
      (end && Number.isNaN(end.valueOf())) ||
      (start && end && start > end)
    )
      throw new AppError(400, 'INVALID_DATE_RANGE', 'Invalid report date range');
    const dates = { ...(start ? { gte: start } : {}), ...(end ? { lte: end } : {}) };
    let report;
    switch (req.params.type) {
      case 'farm-amu':
      case 'organization-amu': {
        if (
          req.params.type === 'organization-amu' &&
          !req.principal.platformRoles.includes('PLATFORM_ADMIN')
        )
          throw new AppError(403, 'FORBIDDEN', 'Admin report required');
        const rows = await getAmuDataset({ farmIds, start, end });
        report = [
          {
            summary: aggregateAmu(
              rows,
              await prisma.animal.count({ where: { farmId: { in: farmIds }, status: 'ACTIVE' } }),
            ),
            byClass: groupAmu(rows, 'class'),
            byFarm: groupAmu(rows, 'farm'),
            trends: monthlyTrend(rows),
          },
        ];
        break;
      }
      case 'animal-treatment-history':
        report = await prisma.treatment.findMany({
          where: {
            farmId: { in: farmIds },
            ...(req.query.animalId ? { animalId: String(req.query.animalId) } : {}),
            ...(Object.keys(dates).length ? { createdAt: dates } : {}),
          },
          include: {
            animal: true,
            administrations: { include: { drug: true } },
            case: { include: { diagnoses: true } },
          },
        });
        break;
      case 'withdrawal-eligibility':
        report = await prisma.milkEligibilityCheck.findMany({
          where: {
            farmId: { in: farmIds },
            ...(Object.keys(dates).length ? { evaluatedAt: dates } : {}),
          },
          include: { animal: true, treatmentEvaluations: true },
          orderBy: { evaluatedAt: 'desc' },
        });
        break;
      case 'certificates':
        report = await prisma.milkEligibilityCertificate.findMany({
          where: {
            farmId: { in: farmIds },
            ...(Object.keys(dates).length ? { issuedAt: dates } : {}),
          },
          include: { animal: true },
          orderBy: { issuedAt: 'desc' },
        });
        break;
      case 'veterinary-activity':
        report = await prisma.veterinaryCase.findMany({
          where: {
            farmId: { in: farmIds },
            ...(Object.keys(dates).length ? { openedAt: dates } : {}),
          },
          include: {
            veterinarian: { include: { user: { select: { fullName: true } } } },
            _count: { select: { diagnoses: true, prescriptions: true, treatments: true } },
          },
        });
        break;
      case 'audit':
        if (!req.principal.platformRoles.includes('PLATFORM_ADMIN'))
          throw new AppError(403, 'FORBIDDEN', 'Admin report required');
        else
          report = await prisma.auditLog.findMany({
            where: {
              ...(req.query.farmId ? { farmId: String(req.query.farmId) } : {}),
              ...(Object.keys(dates).length ? { createdAt: dates } : {}),
            },
            orderBy: { createdAt: 'desc' },
          });
        break;
      case 'blockchain':
        if (!req.principal.platformRoles.includes('PLATFORM_ADMIN'))
          throw new AppError(403, 'FORBIDDEN', 'Admin report required');
        else report = await prisma.blockchainAnchor.findMany({ orderBy: { createdAt: 'desc' } });
        break;
      default:
        throw new AppError(404, 'REPORT_NOT_FOUND', 'Report type not found');
    }
    if (req.query.format === 'csv') {
      res
        .set({
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${req.params.type}.csv"`,
        })
        .send(csv(report));
      return;
    }
    res.json({ data: { reportType: req.params.type, generatedAt: new Date(), rows: report } });
  }),
);
