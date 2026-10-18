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
      routeMatches(rule.route, context.route) &&
      (!rule.formulation ||
        rule.formulation === 'ANY_AS_LABELLED' ||
        rule.formulation === context.formulation) &&
      (!rule.effectiveFrom || rule.effectiveFrom <= context.administeredAt) &&
      (!rule.effectiveTo || rule.effectiveTo >= context.administeredAt),
  );
  if (exact.length > 1) return { status: 'REVIEW_REQUIRED', reason: 'CONFLICTING_SOURCE' };
  const candidate = exact[0];
  if (candidate && ['NOT_AVAILABLE', 'RULE_NOT_FOUND'].includes(candidate.verificationStatus))
    return { status: 'RULE_NOT_FOUND', rule: candidate, reason: candidate.verificationStatus };
  const certificateBlocked = candidate?.certificateUse?.startsWith('BLOCK');
  if (
    exact.length === 1 &&
    !certificateBlocked &&
    (candidate.verificationStatus === 'VERIFIED' ||
      (context.allowDemonstrationReference && candidate.verificationStatus === 'EXAMPLE_ONLY'))
  )
    return {
      status: 'VERIFIED',
      rule: candidate,
      demonstrationReference: candidate.verificationStatus === 'EXAMPLE_ONLY',
    };
  if (exact.length === 1)
    return {
      status: 'REVIEW_REQUIRED',
      rule: candidate,
      reason: certificateBlocked
        ? 'REFERENCE_BLOCKED_FOR_CERTIFICATE_USE'
        : candidate.verificationStatus,
    };
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
      species: true,
      treatments: {
        include: { administrations: { include: { drug: true, drugProduct: true } } },
        orderBy: { createdAt: 'asc' },
      },
    },
  });
  if (!animal) return null;
  if (!animal.lactating)
    return {
      animal,
      applicable: false,
      status: 'REVIEW_REQUIRED',
      eligibilityDate: null,
      evaluatedAt,
      evaluations: [],
      explanation: {
        question:
          'Milk eligibility is not applicable because this animal is not recorded as lactating.',
        blockers: ['ANIMAL_NOT_LACTATING'],
        relevantTreatmentCount: 0,
        disclaimer: 'This is a rule-based eligibility result and not a laboratory residue test.',
      },
    };
  const rules = await client.withdrawalRule.findMany({
    where: { speciesId: animal.speciesId, foodProduct: 'MILK' },
    include: { source: true, drug: true, drugProduct: true },
  });
  const evaluations = [];
  for (const treatment of animal.treatments) {
    if (treatment.status === 'CANCELLED' && treatment.administrations.length === 0) continue;
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
      const evidenceEnd =
        treatment.completedAt ||
        (treatment.status === 'CANCELLED' ? administration.administeredAt : null);
      if (!evidenceEnd) {
        evaluations.push({
          treatmentId: treatment.id,
          drugId: administration.drugId,
          drugProductId: administration.drugProductId,
          route: administration.route,
          lastAdministrationAt: administration.administeredAt,
          status: 'REVIEW_REQUIRED',
          blockerCode: 'TREATMENT_COMPLETION_DATE_MISSING',
        });
        continue;
      }
      const resolution = resolveRule(rules, {
        drugId: administration.drugId,
        drugProductId: administration.drugProductId,
        route: administration.route,
        formulation: administration.drugProduct?.formulation || null,
        administeredAt: administration.administeredAt,
        jurisdiction: animal.farm.demonstrationMode ? animal.farm.regulatoryJurisdiction : 'INDIA',
        allowDemonstrationReference: animal.farm.demonstrationMode,
      });
      if (resolution.status !== 'VERIFIED') {
        evaluations.push({
          treatmentId: treatment.id,
          drugId: administration.drugId,
          drugProductId: administration.drugProductId,
          route: administration.route,
          lastAdministrationAt: administration.administeredAt,
          withdrawalRuleId: resolution.rule?.id,
          status: resolution.status,
          treatmentCompletedAt: treatment.completedAt,
          blockerCode: resolution.reason,
          ruleSnapshot: resolution.rule ? snapshot(resolution.rule) : null,
        });
        continue;
      }
      const anchor =
        administration.administeredAt > evidenceEnd ? administration.administeredAt : evidenceEnd;
      const withdrawalEndsAt = addWithdrawalDuration(
        anchor,
        Number(resolution.rule.durationValue),
        resolution.rule.durationUnit,
      );
      evaluations.push({
        treatmentId: treatment.id,
        drugId: administration.drugId,
        drugProductId: administration.drugProductId,
        route: administration.route,
        lastAdministrationAt: administration.administeredAt,
        withdrawalRuleId: resolution.rule.id,
        status: evaluatedAt < withdrawalEndsAt ? 'UNDER_WITHDRAWAL' : 'ELIGIBLE_FOR_MILK',
        treatmentCompletedAt: treatment.completedAt,
        withdrawalEndsAt,
        ruleSnapshot: snapshot(resolution.rule, resolution.demonstrationReference),
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
  for (const item of evaluations)
    item.evidenceScopeHash = crypto
      .createHash('sha256')
      .update(
        [item.treatmentId, item.drugId || '', item.drugProductId || '', item.route || ''].join('|'),
      )
      .digest('hex');
  return {
    animal,
    applicable: true,
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
      disclaimer: 'This is a rule-based eligibility result and not a laboratory residue test.',
    },
  };
}

function snapshot(rule, demonstrationReference = false) {
  return {
    id: rule.id,
    code: rule.code,
    version: rule.version,
    durationValue: String(rule.durationValue),
    durationUnit: rule.durationUnit,
    jurisdiction: rule.jurisdiction,
    route: rule.route,
    formulation: rule.formulation,
    certificateUse: rule.certificateUse,
    ruleType: rule.ruleType,
    verificationStatus: rule.verificationStatus,
    demonstrationReference,
    ...(demonstrationReference
      ? { warning: 'DEMONSTRATION REFERENCE — NOT AN INDIAN REGULATORY RULE' }
      : {}),
    source: {
      organization: rule.source.organization,
      title: rule.source.title,
      url: rule.source.url,
      section: rule.sourceSection,
      jurisdiction: rule.source.jurisdiction,
    },
  };
}

export async function reconcileCurrentEligibility(
  tx,
  { animalId, inputHash, calculated, triggeredBy },
) {
  const previous = await tx.milkEligibilityCheck.findFirst({
    where: { animalId, isCurrent: true },
    orderBy: { evaluatedAt: 'desc' },
  });
  const existing = await tx.milkEligibilityCheck.findUnique({
    where: { animalId_inputHash: { animalId, inputHash } },
    include: { treatmentEvaluations: true },
  });
  await tx.milkEligibilityCheck.updateMany({
    where: { animalId, isCurrent: true },
    data: { isCurrent: false },
  });
  const check = existing
    ? await tx.milkEligibilityCheck.update({
        where: { id: existing.id },
        data: {
          isCurrent: true,
          evaluatedAt: calculated.evaluatedAt,
          eligibilityDate: calculated.eligibilityDate,
          explanation: calculated.explanation,
          triggeredBy,
        },
        include: { treatmentEvaluations: true },
      })
    : await tx.milkEligibilityCheck.create({
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
  return {
    previous,
    check,
    changed: !previous || previous.id !== check.id || previous.status !== check.status,
  };
}

export async function evaluateAndPersist(animalId, triggeredBy, actorUserId = null) {
  const calculated = await calculateEligibility(animalId);
  if (!calculated) return null;
  const hashPayload = calculated.evaluations.map((x) => ({
    treatmentId: x.treatmentId,
    drugId: x.drugId,
    drugProductId: x.drugProductId,
    route: x.route,
    lastAdministrationAt: x.lastAdministrationAt?.toISOString(),
    status: x.status,
    ruleId: x.withdrawalRuleId,
    end: x.withdrawalEndsAt?.toISOString(),
    blockerCode: x.blockerCode,
    ruleSnapshot: x.ruleSnapshot,
  }));
  const inputHash = crypto
    .createHash('sha256')
    .update(
      JSON.stringify({
        applicable: calculated.applicable,
        status: calculated.status,
        hashPayload,
        methodologyVersion: METHODOLOGY_VERSION,
      }),
    )
    .digest('hex');
  const result = await prisma.$transaction(async (tx) => {
    const { previous, check, changed } = await reconcileCurrentEligibility(tx, {
      animalId,
      inputHash,
      calculated,
      triggeredBy,
    });
    if (changed)
      await tx.animalProfileEvent.create({
        data: {
          animalId,
          actorUserId,
          eventType: 'MILK_ELIGIBILITY_CHANGED',
          summary: previous
            ? `Milk eligibility changed: ${previous.status} → ${check.status}`
            : `Milk eligibility evaluated: ${check.status}`,
          details: {
            eligibilityCheckId: check.id,
            previousStatus: previous?.status || null,
            status: check.status,
            eligibilityDate: check.eligibilityDate?.toISOString() || null,
          },
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
    if (changed)
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
    if (changed)
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
  if (triggeredBy !== 'DAILY_CLEARANCE_EVALUATION') {
    const { refreshTodayAfterEligibilityChange } =
      await import('../daily-clearance/change-hook.js');
    await refreshTodayAfterEligibilityChange(calculated.animal.farmId, actorUserId);
  }
  return result;
}
