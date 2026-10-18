import { prisma } from '../../infrastructure/prisma/client.js';
import { businessDateFor, businessDateValue } from './business-date.js';
import { runDailyEvaluation } from './service.js';

export async function refreshTodayAfterEligibilityChange(farmId, actorUserId = null) {
  const farm = await prisma.farm.findUnique({ where: { id: farmId }, select: { timeZone: true } });
  if (!farm) return null;
  const businessDate = businessDateValue(businessDateFor(new Date(), farm.timeZone));
  const exists = await prisma.dailyFarmEligibilityEvaluation.count({
    where: { farmId, businessDate },
  });
  if (!exists) return null;
  return runDailyEvaluation(farmId, {
    actorUserId,
    trigger: 'MID_DAY_ELIGIBILITY_CHANGE',
  });
}
