import crypto from 'node:crypto';
import { prisma } from '../../infrastructure/prisma/client.js';
import { AppError } from '../../common/errors.js';
import { appendAudit } from '../audit/index.js';
import { createAlerts } from '../alerts/service.js';
import { evaluateAndPersist } from '../withdrawal/service.js';
import {
  CANONICALIZATION_VERSION,
  CERTIFICATE_DISCLAIMER,
  hashCertificatePayload,
} from './canonical.js';

const evidence = {
  animal: { include: { farm: true, species: true } },
  treatmentEvaluations: {
    include: { treatment: true, drug: true, withdrawalRule: { include: { source: true } } },
  },
};
function snapshot(check, certificateNumber, issuedAt) {
  const demonstrationReference = check.treatmentEvaluations.some(
    (item) => item.ruleSnapshot?.demonstrationReference,
  );
  const disclaimer = demonstrationReference
    ? `${CERTIFICATE_DISCLAIMER} DEMONSTRATION REFERENCE — NOT AN INDIAN REGULATORY RULE`
    : CERTIFICATE_DISCLAIMER;
  return {
    schema: CANONICALIZATION_VERSION,
    certificateNumber,
    issuedAt: issuedAt.toISOString(),
    animal: { tagNumber: check.animal.tagNumber, species: check.animal.species.canonicalName },
    farm: { name: check.animal.farm.name },
    regulatoryContext: {
      jurisdiction: check.animal.farm.regulatoryJurisdiction,
      demonstrationMode: check.animal.farm.demonstrationMode,
      ...(demonstrationReference
        ? { warning: 'DEMONSTRATION REFERENCE — NOT AN INDIAN REGULATORY RULE' }
        : {}),
    },
    eligibility: {
      evaluationId: check.id,
      evaluatedAt: check.evaluatedAt.toISOString(),
      eligibleFrom: check.eligibilityDate.toISOString(),
      methodologyVersion: check.methodologyVersion,
      treatments: check.treatmentEvaluations.map((item) => ({
        treatmentId: item.treatmentId,
        drug: item.drug?.canonicalName || null,
        treatmentCompletedAt: item.treatmentCompletedAt?.toISOString() || null,
        withdrawalEndsAt: item.withdrawalEndsAt?.toISOString() || null,
        rule: item.ruleSnapshot || null,
      })),
    },
    disclaimer,
  };
}
const number = () =>
  `MEC-${new Date().getUTCFullYear()}-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;

export async function issueCertificate(animalId, actorUserId) {
  await evaluateAndPersist(animalId, 'CERTIFICATE_ISSUANCE_CHECK', actorUserId);
  const check = await prisma.milkEligibilityCheck.findFirst({
    where: { animalId, isCurrent: true },
    include: evidence,
  });
  if (!check) throw new AppError(404, 'ANIMAL_NOT_FOUND', 'Animal not found');
  if (check.status !== 'ELIGIBLE_FOR_MILK')
    throw new AppError(
      409,
      'CERTIFICATE_BLOCKED',
      `Certificate issuance is blocked by ${check.status}`,
    );
  const prior = await prisma.milkEligibilityCertificate.findUnique({
    where: { eligibilityCheckId: check.id },
  });
  if (prior) return { certificate: prior, created: false };
  const issuedAt = new Date();
  const certificateNumber = number();
  const canonicalPayload = snapshot(check, certificateNumber, issuedAt);
  const certificate = await prisma.$transaction(async (tx) => {
    await tx.milkEligibilityCertificate.updateMany({
      where: { animalId, status: 'ACTIVE' },
      data: {
        status: 'SUPERSEDED',
        revokedAt: issuedAt,
        revokedById: actorUserId,
        revocationCode: 'NEW_CERTIFICATE',
        revocationReason: 'Superseded by a newer eligible evaluation.',
      },
    });
    const created = await tx.milkEligibilityCertificate.create({
      data: {
        certificateNumber,
        verificationId: crypto.randomBytes(24).toString('base64url'),
        animalId,
        farmId: check.farmId,
        eligibilityCheckId: check.id,
        issuedById: actorUserId,
        eligibleFrom: check.eligibilityDate,
        canonicalizationVersion: CANONICALIZATION_VERSION,
        canonicalPayload,
        contentHashSha256: hashCertificatePayload(canonicalPayload),
        disclaimer: canonicalPayload.disclaimer,
      },
    });
    const members = await tx.farmMember.findMany({
      where: { farmId: check.farmId, status: 'ACTIVE' },
      select: { userId: true },
    });
    await createAlerts(
      tx,
      members.map((x) => x.userId),
      {
        farmId: check.farmId,
        type: 'CERTIFICATE_ISSUED',
        title: 'Milk eligibility certificate issued',
        message: `Certificate ${created.certificateNumber} is active.`,
        entityType: 'MilkEligibilityCertificate',
        entityId: created.id,
        dedupKeyPrefix: `certificate:${created.id}:issued`,
      },
    );
    await appendAudit(
      {
        actorUserId,
        action: 'CERTIFICATE_ISSUED',
        entityType: 'MilkEligibilityCertificate',
        entityId: created.id,
        farmId: check.farmId,
        newData: { eligibilityCheckId: check.id, contentHashSha256: created.contentHashSha256 },
      },
      tx,
    );
    return created;
  });
  return { certificate, created: true };
}

export async function revokeCertificate(id, actorUserId, code, reason) {
  const certificate = await prisma.milkEligibilityCertificate.findUnique({ where: { id } });
  if (!certificate) throw new AppError(404, 'CERTIFICATE_NOT_FOUND', 'Certificate not found');
  if (certificate.status !== 'ACTIVE')
    throw new AppError(
      409,
      'INVALID_CERTIFICATE_STATE',
      'Only an active certificate can be revoked',
    );
  return prisma.$transaction(async (tx) => {
    const updated = await tx.milkEligibilityCertificate.update({
      where: { id },
      data: {
        status: 'REVOKED',
        revokedAt: new Date(),
        revokedById: actorUserId,
        revocationCode: code,
        revocationReason: reason,
      },
    });
    const members = await tx.farmMember.findMany({
      where: { farmId: certificate.farmId, status: 'ACTIVE' },
      select: { userId: true },
    });
    await createAlerts(
      tx,
      members.map((x) => x.userId),
      {
        farmId: certificate.farmId,
        type: 'CERTIFICATE_REVOKED',
        title: 'Milk eligibility certificate revoked',
        message: `Certificate ${certificate.certificateNumber} was revoked.`,
        entityType: 'MilkEligibilityCertificate',
        entityId: id,
        dedupKeyPrefix: `certificate:${id}:revoked:admin`,
      },
    );
    await appendAudit(
      {
        actorUserId,
        action: 'CERTIFICATE_REVOKED',
        entityType: 'MilkEligibilityCertificate',
        entityId: id,
        farmId: certificate.farmId,
        previousData: { status: 'ACTIVE' },
        newData: { status: 'REVOKED', code, reason },
      },
      tx,
    );
    return updated;
  });
}
