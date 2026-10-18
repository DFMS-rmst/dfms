import { prisma } from '../../infrastructure/prisma/client.js';
import { runDailyEvaluation } from './service.js';

export async function runMorningEvaluations(now = new Date()) {
  const farms = await prisma.farm.findMany({ where: { status: 'ACTIVE' }, select: { id: true } });
  const results = await Promise.allSettled(
    farms.map((farm) => runDailyEvaluation(farm.id, { now, trigger: 'MORNING_SCHEDULER' })),
  );
  results.forEach((result, index) => {
    if (result.status === 'rejected')
      console.error(`Daily evaluation failed for farm ${farms[index].id}`, result.reason);
  });
  return results;
}

export function startDailyEvaluationScheduler() {
  const run = () =>
    runMorningEvaluations().catch((error) =>
      console.error('Daily evaluation scheduler failed', error),
    );
  run();
  const timer = setInterval(run, 15 * 60 * 1000);
  timer.unref();
  return () => clearInterval(timer);
}
