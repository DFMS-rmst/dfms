import crypto from 'node:crypto';
import { prisma } from '../../infrastructure/prisma/client.js';
import { createAlerts } from '../alerts/service.js';
import { appendAudit } from '../audit/index.js';
import { revokeActiveCertificates } from '../certificates/lifecycle.js';

export const METHODOLOGY_VERSION = 'SIH-WITHDRAWAL-1.0';

export function addWithdrawalDuration(start, value, unit) {
  if (!(start instanceof Date) || Number.isNaN(start.valueOf()) || value < 0)
    throw new Error('Invalid withdrawal date or duration');
  const multipliers = { HOUR: 3_600_000, DAY: 86_400_000 };
  if (!multipliers[unit]) throw new Error(`Unsupported withdrawal unit: ${unit}`);
  return new Date(start.getTime() + Number(value) * multipliers[unit]);
}

const routeMatches = (ruleRoute, route) =>
  ruleRoute === 'ANY_AS_LABELLED' || ruleRoute.split('_OR_').includes(route);

export function resolveRule(rules, context) {
  const exact = rules.filter(
    (rule) =>
      rule.drugId === context.drugId &&
      rule.drugProductId === context.drugProductId &&
      rule.jurisdiction === context.jurisdiction &&
      routeMatches(rule.route, context.route),
  );
  if (exact.length > 1) return { status: 'REVIEW_REQUIRED', reason: 'CONFLICTING_SOURCE' };
  if (exact.length === 1 && exact[0].verificationStatus === 'VERIFIED')
    return { status: 'VERIFIED', rule: exact[0] };
  if (exact.length === 1) return { status: 'REVIEW_REQUIRED', rule: exact[0] };
  const reviewRule = rules.find(
    (rule) => rule.ruleType === 'STATUTORY_MINIMUM' && rule.jurisdiction === context.jurisdiction,
  );
  return reviewRule
    ? { status: 'REVIEW_REQUIRED', rule: reviewRule, reason: 'MINIMUM_ONLY_REQUIRES_REVIEW' }
    : { status: 'RULE_NOT_FOUND', reason: 'NO_EXACT_APPLICABLE_RULE' };
}

export async function calculateEligibility(animalId, evaluatedAt = new Date(), client = prisma) {
  if (Number.isNaN(evaluatedAt.valueOf())) throw new Error('Invalid evaluation date');
  const animal = await client.animal.findUnique({
    where: { id: animalId },
    include: {
      farm: true,
      treatments: {
        where: { status: { not: 'CANCELLED' } },
        include: { administrations: true },
        orderBy: { createdAt: 'asc' },
      },
    },
  });
  if (!animal) return null;
  const rules = await client.withdrawalRule.findMany({
    where: { speciesId: animal.speciesId, foodProduct: 'MILK' },
    include: { source: true, drug: true, drugProduct: true },
  });
  const evaluations = [];
  for (const treatment of animal.treatments) {
    if (treatment.status === 'ACTIVE' || treatment.status === 'PLANNED') {
      evaluations.push({
        treatmentId: treatment.id,
        drugId: null,
        status: 'TREATMENT_ACTIVE',
        treatmentCompletedAt: treatment.completedAt,
        blockerCode: 'TREATMENT_ACTIVE',
      });
      continue;
    }
    const byDrug = new Map();
    for (const administration of treatment.administrations) {
      const key = `${administration.drugId}:${administration.drugProductId || ''}:${administration.route}`;
      const prior = byDrug.get(key);
      if (!prior || administration.administeredAt > prior.administeredAt)
        byDrug.set(key, administration);
    }
    for (const administration of byDrug.values()) {
      if (!treatment.completedAt) {
        evaluations.push({
          treatmentId: treatment.id,
          drugId: administration.drugId,
          status: 'REVIEW_REQUIRED',
          blockerCode: 'TREATMENT_COMPLETION_DATE_MISSING',
        });
        continue;
      }
      const resolution = resolveRule(rules, {
        drugId: administration.drugId,
        drugProductId: administration.drugProductId,
        route: administration.route,
        jurisdiction: 'INDIA',
      });
      if (resolution.status !== 'VERIFIED') {
        evaluations.push({
          treatmentId: treatment.id,
          drugId: administration.drugId,
          withdrawalRuleId: resolution.rule?.id,
          status: resolution.status,
          treatmentCompletedAt: treatment.completedAt,
          blockerCode: resolution.reason,
          ruleSnapshot: resolution.rule ? snapshot(resolution.rule) : null,
        });
        continue;
      }
      const anchor =
        administration.administeredAt > treatment.completedAt
          ? administration.administeredAt
          : treatment.completedAt;
      const withdrawalEndsAt = addWithdrawalDuration(
        anchor,
        Number(resolution.rule.durationValue),
        resolution.rule.durationUnit,
      );
      evaluations.push({
        treatmentId: treatment.id,
        drugId: administration.drugId,
        withdrawalRuleId: resolution.rule.id,
        status: evaluatedAt < withdrawalEndsAt ? 'UNDER_WITHDRAWAL' : 'ELIGIBLE_FOR_MILK',
        treatmentCompletedAt: treatment.completedAt,
        withdrawalEndsAt,
        ruleSnapshot: snapshot(resolution.rule),
      });
    }
  }
  const priority = ['TREATMENT_ACTIVE', 'REVIEW_REQUIRED', 'RULE_NOT_FOUND', 'UNDER_WITHDRAWAL'];
  const status =
    priority.find((value) => evaluations.some((x) => x.status === value)) || 'ELIGIBLE_FOR_MILK';
  const eligibilityDate = evaluations.some((x) =>
    ['REVIEW_REQUIRED', 'RULE_NOT_FOUND', 'TREATMENT_ACTIVE'].includes(x.status),
  )
    ? null
    : evaluations.reduce(
        (latest, x) => (x.withdrawalEndsAt > latest ? x.withdrawalEndsAt : latest),
        new Date(0),
      );
  return {
    animal,
    status,
    eligibilityDate: eligibilityDate?.getTime() ? eligibilityDate : evaluatedAt,
    evaluatedAt,
    evaluations,
    explanation: {
      question:
        'Eligibility is based on recorded treatment history and verified withdrawal rules; no residue was measured.',
      blockers: evaluations
        .filter((x) => x.status !== 'ELIGIBLE_FOR_MILK')
        .map((x) => x.blockerCode || x.status),
      relevantTreatmentCount: new Set(evaluations.map((x) => x.treatmentId)).size,
    },
  };
}

function snapshot(rule) {
  return {
    id: rule.id,
    code: rule.code,
    version: rule.version,
    durationValue: String(rule.durationValue),
    durationUnit: rule.durationUnit,
    jurisdiction: rule.jurisdiction,
    ruleType: rule.ruleType,
    verificationStatus: rule.verificationStatus,
    source: {
      organization: rule.source.organization,
      title: rule.source.title,
      url: rule.source.url,
      section: rule.sourceSection,
    },
  };
}

export async function evaluateAndPersist(animalId, triggeredBy, actorUserId = null) {
  const calculated = await calculateEligibility(animalId);
  if (!calculated) return null;
  const hashPayload = calculated.evaluations.map((x) => ({
    treatmentId: x.treatmentId,
    drugId: x.drugId,
    status: x.status,
    ruleId: x.withdrawalRuleId,
    end: x.withdrawalEndsAt?.toISOString(),
  }));
  const inputHash = crypto
    .createHash('sha256')
    .update(JSON.stringify({ status: calculated.status, hashPayload }))
    .digest('hex');
  const existing = await prisma.milkEligibilityCheck.findUnique({
    where: { animalId_inputHash: { animalId, inputHash } },
    include: { treatmentEvaluations: true },
  });
  if (existing) return existing;
  return prisma.$transaction(async (tx) => {
    const previous = await tx.milkEligibilityCheck.findFirst({
      where: { animalId, isCurrent: true },
      orderBy: { evaluatedAt: 'desc' },
    });
    await tx.milkEligibilityCheck.updateMany({
      where: { animalId, isCurrent: true },
      data: { isCurrent: false },
    });
    const check = await tx.milkEligibilityCheck.create({
      data: {
        animalId,
        farmId: calculated.animal.farmId,
        status: calculated.status,
        eligibilityDate: calculated.eligibilityDate,
        inputHash,
        explanation: calculated.explanation,
        methodologyVersion: METHODOLOGY_VERSION,
        triggeredBy,
        treatmentEvaluations: { create: calculated.evaluations },
      },
      include: { treatmentEvaluations: true },
    });
    await tx.animalProfileEvent.create({
      data: {
        animalId,
        actorUserId,
        eventType: 'MILK_ELIGIBILITY_CHANGED',
        summary: `Milk eligibility: ${check.status}`,
        details: { eligibilityCheckId: check.id, eligibilityDate: check.eligibilityDate },
      },
    });
    const members = await tx.farmMember.findMany({
      where: { farmId: calculated.animal.farmId, status: 'ACTIVE' },
      select: { userId: true },
    });
    const alertType = {
      TREATMENT_ACTIVE: 'ANIMAL_TREATMENT_ACTIVE',
      UNDER_WITHDRAWAL: 'WITHDRAWAL_ACTIVE',
      ELIGIBLE_FOR_MILK: 'ANIMAL_ELIGIBLE_FOR_MILK',
      RULE_NOT_FOUND: 'WITHDRAWAL_RULE_MISSING',
      REVIEW_REQUIRED: 'ELIGIBILITY_REVIEW_REQUIRED',
    }[check.status];
    await createAlerts(
      tx,
      members.map((x) => x.userId),
      {
        farmId: calculated.animal.farmId,
        type: alertType,
        title: check.status.replaceAll('_', ' '),
        message: `Animal ${calculated.animal.tagNumber}: ${check.status.replaceAll('_', ' ').toLowerCase()}`,
        entityType: 'MilkEligibilityCheck',
        entityId: check.id,
        dedupKeyPrefix: `eligibility:${inputHash}:${alertType}`,
      },
    );
    const endingSoon = calculated.evaluations.filter(
      (item) =>
        item.status === 'UNDER_WITHDRAWAL' &&
        item.withdrawalEndsAt - calculated.evaluatedAt <= 86_400_000,
    );
    if (endingSoon.length)
      await createAlerts(
        tx,
        members.map((x) => x.userId),
        {
          farmId: calculated.animal.farmId,
          type: 'WITHDRAWAL_ENDING_SOON',
          title: 'Withdrawal ending soon',
          message: `Animal ${calculated.animal.tagNumber} has a withdrawal period ending within 24 hours`,
          entityType: 'MilkEligibilityCheck',
          entityId: check.id,
          dedupKeyPrefix: `eligibility:${inputHash}:WITHDRAWAL_ENDING_SOON`,
        },
      );
    await appendAudit(
      {
        actorUserId,
        action: 'MILK_ELIGIBILITY_EVALUATED',
        entityType: 'MilkEligibilityCheck',
        entityId: check.id,
        farmId: calculated.animal.farmId,
        previousData: previous ? { status: previous.status } : null,
        newData: { status: check.status, triggeredBy },
      },
      tx,
    );
    await revokeActiveCertificates(tx, {
      animalId,
      status: check.status,
      checkId: check.id,
      actorUserId,
      reasonCode:
        triggeredBy === 'ADMINISTRATION_RECORDED'
          ? 'NEW_ADMINISTRATION'
          : triggeredBy === 'TREATMENT_STATUS_CHANGED'
            ? 'NEW_TREATMENT'
            : 'ELIGIBILITY_REEVALUATION',
    });
    return check;
  });
}
