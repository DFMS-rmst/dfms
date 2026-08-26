import { AppError } from '../../common/errors.js';
import { prisma } from '../../infrastructure/prisma/client.js';

export const requestTransitions = Object.freeze({
  REQUESTED: ['ACCEPTED', 'REJECTED', 'CANCELLED'],
  ACCEPTED: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
  OPEN: ['REQUESTED', 'CANCELLED'],
});
export const caseTransitions = Object.freeze({
  OPEN: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['TREATMENT_STARTED', 'FOLLOW_UP', 'COMPLETED', 'CANCELLED'],
  TREATMENT_STARTED: ['FOLLOW_UP', 'COMPLETED', 'CANCELLED'],
  FOLLOW_UP: ['IN_PROGRESS', 'TREATMENT_STARTED', 'COMPLETED', 'CANCELLED'],
});
export const treatmentTransitions = Object.freeze({
  PLANNED: ['ACTIVE', 'CANCELLED'],
  ACTIVE: ['COMPLETED', 'CANCELLED'],
});
export function assertTransition(map, current, next) {
  if (!map[current]?.includes(next))
    throw new AppError(
      409,
      'INVALID_STATUS_TRANSITION',
      `Cannot transition from ${current} to ${next}`,
    );
}
export async function getVetForUser(userId, requireVerified = true) {
  const vet = await prisma.veterinarianProfile.findUnique({ where: { userId } });
  if (!vet || (requireVerified && vet.status !== 'VERIFIED'))
    throw new AppError(
      403,
      'VERIFIED_VETERINARIAN_REQUIRED',
      'Verified veterinarian access required',
    );
  return vet;
}
export async function loadCaseParticipant(userId, caseId) {
  const item = await prisma.veterinaryCase.findUnique({
    where: { id: caseId },
    include: {
      veterinarian: true,
      farm: { include: { members: { where: { userId, status: 'ACTIVE' } } } },
    },
  });
  if (!item || (item.veterinarian.userId !== userId && item.farm.members.length === 0))
    throw new AppError(404, 'CASE_NOT_FOUND', 'Veterinary case not found');
  return item;
}
export async function assertAssignedVerifiedVet(userId, caseId) {
  const item = await prisma.veterinaryCase.findUnique({
    where: { id: caseId },
    include: { veterinarian: true },
  });
  if (!item || item.veterinarian.userId !== userId || item.veterinarian.status !== 'VERIFIED')
    throw new AppError(
      403,
      'ASSIGNED_VETERINARIAN_REQUIRED',
      'Assigned verified veterinarian required',
    );
  return item;
}
