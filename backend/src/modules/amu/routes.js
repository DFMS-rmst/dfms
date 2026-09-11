import { Router } from 'express';
import { z } from 'zod';
import { authenticate, requireFarmAccess } from '../../common/auth.js';
import { AppError, asyncHandler } from '../../common/errors.js';
import { prisma } from '../../infrastructure/prisma/client.js';
import { aggregateAmu, getAmuDataset, groupAmu, monthlyTrend } from './service.js';

const querySchema = z.object({
  farmId: z.string().optional(),
  start: z.coerce.date().optional(),
  end: z.coerce.date().optional(),
});
async function scope(req) {
  const query = querySchema.parse(req.query);
  if (query.start && query.end && query.start > query.end)
    throw new AppError(400, 'INVALID_DATE_RANGE', 'Start must not be after end');
  const admin = req.principal.platformRoles.includes('PLATFORM_ADMIN');
  if (query.farmId) {
    if (!admin) {
      const assigned = await prisma.veterinaryCase.count({
        where: { farmId: query.farmId, veterinarian: { userId: req.principal.user.id } },
      });
      if (!assigned)
        await requireFarmAccess(req.principal.user.id, query.farmId, [
          'FARM_OWNER',
          'FARM_MANAGER',
        ]);
    }
    return { ...query, farmIds: [query.farmId] };
  }
  if (admin)
    return {
      ...query,
      farmIds: (await prisma.farm.findMany({ select: { id: true } })).map((x) => x.id),
    };
  const memberships = await prisma.farmMember.findMany({
    where: {
      userId: req.principal.user.id,
      status: 'ACTIVE',
      roles: { some: { role: { in: ['FARM_OWNER', 'FARM_MANAGER'] } } },
    },
    select: { farmId: true },
  });
  const vetCases = await prisma.veterinaryCase.findMany({
    where: { veterinarian: { userId: req.principal.user.id } },
    select: { farmId: true },
  });
  const farmIds = [...new Set([...memberships, ...vetCases].map((x) => x.farmId))];
  if (!farmIds.length) throw new AppError(403, 'FORBIDDEN', 'AMU management scope required');
  return { ...query, farmIds };
}
export const amuRouter = Router();
amuRouter.use(authenticate);
amuRouter.get(
  '/summary',
  asyncHandler(async (req, res) => {
    const filter = await scope(req);
    const rows = await getAmuDataset(filter);
    const animalCount = await prisma.animal.count({
      where: { farmId: { in: filter.farmIds }, status: 'ACTIVE' },
    });
    res.json({ data: { summary: aggregateAmu(rows, animalCount), filters: filter } });
  }),
);
amuRouter.get(
  '/trends',
  asyncHandler(async (req, res) => {
    const filter = await scope(req);
    res.json({ data: { trends: monthlyTrend(await getAmuDataset(filter)), filters: filter } });
  }),
);
for (const dimension of ['drug', 'class', 'species', 'disease', 'farm', 'veterinarian'])
  amuRouter.get(
    `/by-${dimension}`,
    asyncHandler(async (req, res) => {
      const filter = await scope(req);
      res.json({
        data: {
          groups: groupAmu(await getAmuDataset(filter), dimension),
          dimension,
          filters: filter,
        },
      });
    }),
  );
amuRouter.get(
  '/by-active-ingredient',
  asyncHandler(async (req, res) => {
    const filter = await scope(req);
    res.json({
      data: {
        groups: groupAmu(await getAmuDataset(filter), 'drug'),
        dimension: 'activeIngredient',
        filters: filter,
      },
    });
  }),
);
