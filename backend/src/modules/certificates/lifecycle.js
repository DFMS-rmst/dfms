import { createAlerts } from '../alerts/service.js';
import { appendAudit } from '../audit/index.js';

export async function revokeActiveCertificates(
  client,
  { animalId, status, checkId, actorUserId = null, reasonCode = 'ELIGIBILITY_REEVALUATION' },
) {
  if (status === 'ELIGIBLE_FOR_MILK') return [];
  const active = await client.milkEligibilityCertificate.findMany({
    where: { animalId, status: 'ACTIVE' },
  });
  if (!active.length) return [];
  const now = new Date();
  await client.milkEligibilityCertificate.updateMany({
    where: { id: { in: active.map((item) => item.id) }, status: 'ACTIVE' },
    data: {
      status: 'REVOKED',
      revokedAt: now,
      revokedById: actorUserId,
      revocationCode: reasonCode,
      revocationReason: `Current eligibility changed to ${status} (${checkId}).`,
    },
  });
  const members = await client.farmMember.findMany({
    where: { farmId: active[0].farmId, status: 'ACTIVE' },
    select: { userId: true },
  });
  for (const certificate of active) {
    await createAlerts(
      client,
      members.map((item) => item.userId),
      {
        farmId: certificate.farmId,
        type: 'CERTIFICATE_REVOKED',
        title: 'Milk eligibility certificate revoked',
        message: `Certificate ${certificate.certificateNumber} was revoked after eligibility changed.`,
        entityType: 'MilkEligibilityCertificate',
        entityId: certificate.id,
        dedupKeyPrefix: `certificate:${certificate.id}:revoked:${checkId}`,
      },
    );
    await appendAudit(
      {
        actorUserId,
        action: 'CERTIFICATE_REVOKED',
        entityType: 'MilkEligibilityCertificate',
        entityId: certificate.id,
        farmId: certificate.farmId,
        previousData: { status: 'ACTIVE' },
        newData: { status: 'REVOKED', reasonCode, eligibilityCheckId: checkId },
      },
      client,
    );
  }
  return active;
}
