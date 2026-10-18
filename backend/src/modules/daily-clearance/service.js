import crypto from 'node:crypto';
import { prisma } from '../../infrastructure/prisma/client.js';
import { createAlerts } from '../alerts/service.js';
import { appendAudit } from '../audit/index.js';
import { evaluateAndPersist } from '../withdrawal/service.js';
import { businessDateFor, businessDateValue } from './business-date.js';
import {
  DAILY_CLEARANCE_CANONICAL_VERSION,
  DAILY_CLEARANCE_DISCLAIMER,
  hashDailySnapshot,
} from './canonical.js';

const blockingReason = (check) =>
  check.explanation?.blockers?.[0] ||
  check.treatmentEvaluations?.find((item) => item.status !== 'ELIGIBLE_FOR_MILK')?.blockerCode ||
  check.status;

function evidence(item) {
  return {
    animalId: item.animal.id,
    animalTag: item.animal.tagNumber,
    animalName: item.animal.name || null,
    eligibilityCheckId: item.id,
    eligibilityStatus: item.status,
    evaluatedAt: item.evaluatedAt.toISOString(),
    // A no-treatment animal is currently eligible, but there is no withdrawal
    // completion instant to snapshot as "eligible from".  The eligibility engine
    // uses its evaluation time in that case, which is intentionally omitted here
    // so an unchanged daily result stays idempotent.
    eligibleFrom:
      item.status === 'ELIGIBLE_FOR_MILK' && item.treatmentEvaluations?.length > 0
        ? item.eligibilityDate?.toISOString() || null
        : null,
    blockingReason: item.status === 'ELIGIBLE_FOR_MILK' ? null : blockingReason(item),
    withdrawalEndsAt:
      item.treatmentEvaluations
        ?.map((x) => x.withdrawalEndsAt)
        .filter(Boolean)
        .sort((a, b) => b - a)[0]
        ?.toISOString() || null,
  };
}

export function buildDailySnapshot(farm, date, checks, evaluatedAt) {
  const animals = checks.map(evidence).sort((a, b) => a.animalId.localeCompare(b.animalId));
  return {
    schemaVersion: DAILY_CLEARANCE_CANONICAL_VERSION,
    farm: { id: farm.id, name: farm.name },
    businessDate: date,
    timeZone: farm.timeZone,
    evaluatedAt: evaluatedAt.toISOString(),
    applicableCount: animals.length,
    eligibleCount: animals.filter((item) => item.eligibilityStatus === 'ELIGIBLE_FOR_MILK').length,
    animals,
    disclaimer: DAILY_CLEARANCE_DISCLAIMER,
  };
}

const clearanceNumber = (farmId, date, version) =>
  `DMC-${date.replaceAll('-', '')}-${farmId.slice(-6).toUpperCase()}-V${version}`;

async function recipients(tx, farmId) {
  return (
    await tx.farmMember.findMany({
      where: { farmId, status: 'ACTIVE' },
      select: { userId: true },
    })
  ).map((item) => item.userId);
}

export async function runDailyEvaluation(
  farmId,
  { now = new Date(), actorUserId = null, trigger = 'DAILY_EVALUATION' } = {},
) {
  const farm = await prisma.farm.findUnique({ where: { id: farmId } });
  if (!farm) return null;
  const date = businessDateFor(now, farm.timeZone);
  const businessDate = businessDateValue(date);
  await prisma.dailyEligibilityJob.upsert({
    where: { farmId_businessDate: { farmId, businessDate } },
    create: { farmId, businessDate, status: 'RUNNING' },
    update: {
      status: 'RUNNING',
      startedAt: now,
      completedAt: null,
      lastError: null,
      attemptCount: { increment: 1 },
    },
  });
  try {
    const animals = await prisma.animal.findMany({
      where: { farmId, status: 'ACTIVE', lactating: true },
      select: { id: true },
      orderBy: { id: 'asc' },
    });
    for (const animal of animals)
      await evaluateAndPersist(
        animal.id,
        'DAILY_CLEARANCE_EVALUATION',
        actorUserId || farm.createdById,
      );
    const checks = await prisma.milkEligibilityCheck.findMany({
      where: { farmId, animalId: { in: animals.map((item) => item.id) }, isCurrent: true },
      include: { animal: true, treatmentEvaluations: true },
      orderBy: { animalId: 'asc' },
    });
    const payload = buildDailySnapshot(farm, date, checks, now);
    const comparisonPayload = {
      ...payload,
      evaluatedAt: null,
      // Eligibility checks are immutable evidence records, but Stage 3 may create or
      // reactivate an equivalent record during reevaluation.  Neither its database id
      // nor its evaluation timestamp changes the operational eligible/blocked set.
      animals: payload.animals.map(
        ({ eligibilityCheckId: _eligibilityCheckId, evaluatedAt: _evaluatedAt, ...item }) => item,
      ),
    };
    const snapshotHashSha256 = hashDailySnapshot(comparisonPayload);
    let result;
    try {
      result = await prisma.$transaction(async (tx) => {
        const current = await tx.dailyFarmEligibilityEvaluation.findFirst({
          where: { farmId, businessDate, status: 'CURRENT' },
          include: { items: true, clearance: true },
          orderBy: { version: 'desc' },
        });
        if (current?.snapshotHashSha256 === snapshotHashSha256)
          return { evaluation: current, created: false };
        const latest = await tx.dailyFarmEligibilityEvaluation.findFirst({
          where: { farmId, businessDate },
          orderBy: { version: 'desc' },
        });
        const version = (latest?.version || 0) + 1;
        if (current)
          await tx.dailyFarmEligibilityEvaluation.update({
            where: { id: current.id },
            data: {
              status: 'SUPERSEDED',
              currentSlot: null,
              invalidatedAt: now,
              invalidationReason: 'CURRENT_ELIGIBILITY_EVIDENCE_CHANGED',
            },
          });
        const evaluation = await tx.dailyFarmEligibilityEvaluation.create({
          data: {
            farmId,
            businessDate,
            timeZone: farm.timeZone,
            version,
            evaluatedAt: now,
            applicableCount: payload.applicableCount,
            eligibleCount: payload.eligibleCount,
            blockedCount: payload.applicableCount - payload.eligibleCount,
            snapshotHashSha256,
            canonicalPayload: payload,
            currentSlot: `${farmId}:${date}`,
            items: {
              create: checks.map((check) => {
                const item = evidence(check);
                return {
                  animalId: check.animalId,
                  eligibilityCheckId: check.id,
                  included: check.status === 'ELIGIBLE_FOR_MILK',
                  eligibilityStatus: check.status,
                  animalTagSnapshot: check.animal.tagNumber,
                  animalNameSnapshot: check.animal.name,
                  evaluatedAt: check.evaluatedAt,
                  eligibleFrom: check.eligibilityDate,
                  blockingReason: item.blockingReason,
                  withdrawalEndsAt: item.withdrawalEndsAt ? new Date(item.withdrawalEndsAt) : null,
                  evidenceSnapshot: item,
                };
              }),
            },
          },
        });
        if (current)
          await tx.dailyFarmEligibilityEvaluation.update({
            where: { id: current.id },
            data: { supersededById: evaluation.id },
          });
        let clearance = null;
        if (payload.eligibleCount > 0) {
          const number = clearanceNumber(farmId, date, version);
          const clearancePayload = { ...payload, clearanceNumber: number, version };
          clearance = await tx.dailyMilkCollectionClearance.create({
            data: {
              evaluationId: evaluation.id,
              clearanceNumber: number,
              verificationId: crypto.randomBytes(24).toString('base64url'),
              generatedById: actorUserId,
              generatedAt: now,
              canonicalizationVersion: DAILY_CLEARANCE_CANONICAL_VERSION,
              canonicalPayload: clearancePayload,
              contentHashSha256: hashDailySnapshot(clearancePayload),
              disclaimer: DAILY_CLEARANCE_DISCLAIMER,
            },
          });
        }
        const userIds = await recipients(tx, farmId);
        await createAlerts(tx, userIds, {
          farmId,
          type: current ? 'DAILY_CLEARANCE_CHANGED' : 'DAILY_ELIGIBILITY_READY',
          title: current
            ? "Today's milk collection clearance changed"
            : "Today's milk eligibility is ready",
          message: current
            ? `Today's current clearance is now version ${version}: ${payload.eligibleCount} of ${payload.applicableCount} applicable animals are eligible.`
            : `Today's milk eligibility evaluation is ready: ${payload.eligibleCount} of ${payload.applicableCount} applicable animals are eligible.`,
          entityType: 'DailyFarmEligibilityEvaluation',
          entityId: evaluation.id,
          dedupKeyPrefix: `daily-eligibility:${farmId}:${date}:v${version}`,
        });
        await appendAudit(
          {
            actorUserId,
            action: current ? 'DAILY_CLEARANCE_VERSIONED' : 'DAILY_ELIGIBILITY_GENERATED',
            entityType: 'DailyFarmEligibilityEvaluation',
            entityId: evaluation.id,
            farmId,
            newData: { businessDate: date, version, eligibleCount: payload.eligibleCount, trigger },
          },
          tx,
        );
        return { evaluation: { ...evaluation, clearance }, created: true };
      });
    } catch (error) {
      if (error.code !== 'P2002') throw error;
      const winner = await prisma.dailyFarmEligibilityEvaluation.findUnique({
        where: { currentSlot: `${farmId}:${date}` },
      });
      if (!winner) throw error;
      result = { evaluation: winner, created: false };
    }
    await prisma.dailyEligibilityJob.update({
      where: { farmId_businessDate: { farmId, businessDate } },
      data: { status: 'COMPLETED', completedAt: new Date(), lastError: null },
    });
    return getDailyEvaluation(result.evaluation.id);
  } catch (error) {
    await prisma.dailyEligibilityJob.update({
      where: { farmId_businessDate: { farmId, businessDate } },
      data: {
        status: 'FAILED',
        completedAt: new Date(),
        lastError: String(error.message).slice(0, 2000),
      },
    });
    throw error;
  }
}

export const getDailyEvaluation = (id) =>
  prisma.dailyFarmEligibilityEvaluation.findUnique({
    where: { id },
    include: { farm: true, items: { orderBy: { animalTagSnapshot: 'asc' } }, clearance: true },
  });

export async function getToday(farmId, options = {}) {
  const now = options.now || new Date();
  const farm = await prisma.farm.findUnique({ where: { id: farmId }, select: { timeZone: true } });
  if (!farm) return null;
  const businessDate = businessDateValue(businessDateFor(now, farm.timeZone));
  const current = await prisma.dailyFarmEligibilityEvaluation.findFirst({
    where: { farmId, businessDate, status: 'CURRENT' },
    orderBy: { version: 'desc' },
  });
  const recentlyEvaluated =
    current && now.getTime() - current.evaluatedAt.getTime() < 5 * 60 * 1000;
  return recentlyEvaluated
    ? getDailyEvaluation(current.id)
    : runDailyEvaluation(farmId, { ...options, now });
}

export const listDailyEvaluations = (farmId) =>
  prisma.dailyFarmEligibilityEvaluation.findMany({
    where: { farmId },
    include: { clearance: true },
    orderBy: [{ businessDate: 'desc' }, { version: 'desc' }],
  });
