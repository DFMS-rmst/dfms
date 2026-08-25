import { prisma } from '../../infrastructure/prisma/client.js';

export function appendAudit(
  { actorUserId, action, entityType, entityId, farmId, requestId, previousData, newData, metadata },
  client = prisma,
) {
  return client.auditLog.create({
    data: {
      actorUserId,
      action,
      entityType,
      entityId,
      farmId,
      requestId,
      previousData,
      newData,
      metadata,
    },
  });
}
