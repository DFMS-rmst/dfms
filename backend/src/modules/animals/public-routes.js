import { Router } from 'express';
import { AppError, asyncHandler } from '../../common/errors.js';
import { prisma } from '../../infrastructure/prisma/client.js';
import { calculateEligibility } from '../withdrawal/service.js';

export const publicAnimalsRouter = Router();

publicAnimalsRouter.get(
  '/:verificationId',
  asyncHandler(async (request, response) => {
    const animal = await prisma.animal.findUnique({
      where: { verificationId: request.params.verificationId },
      include: { farm: true, species: true, breed: true },
    });
    if (!animal) {
      throw new AppError(404, 'ANIMAL_NOT_FOUND', 'Animal verification record not found');
    }

    const eligibility = await calculateEligibility(animal.id);

    let ruleExplanation = null;
    if (eligibility.status === 'RULE_NOT_FOUND') {
      ruleExplanation =
        'Statutory milk withdrawal reference rule is missing for an administered veterinary substance. Milk collection is strictly blocked under fail-closed safety policy until an authoritative regulatory rule is verified and configured by a platform administrator.';
    } else if (eligibility.status === 'REVIEW_REQUIRED') {
      ruleExplanation =
        'Conflicting reference rules or special regulatory conditions require administrative/veterinary review before milk from this animal can be cleared.';
    } else if (eligibility.status === 'TREATMENT_ACTIVE') {
      ruleExplanation =
        'This animal is currently undergoing an active veterinary treatment course. Milk collection is strictly blocked.';
    } else if (eligibility.status === 'UNDER_WITHDRAWAL') {
      ruleExplanation =
        'This animal is currently within the mandatory withdrawal period following veterinary treatment. Milk collection is strictly blocked until the withdrawal interval has elapsed.';
    }

    const withdrawalEndsAt =
      eligibility.evaluations
        ?.map((x) => x.withdrawalEndsAt)
        .filter(Boolean)
        .sort((a, b) => b - a)[0] || null;

    response.json({
      data: {
        verificationId: animal.verificationId,
        animalTag: animal.tagNumber,
        animalName: animal.name || null,
        species: animal.species?.canonicalName || 'Livestock',
        breed: animal.breed?.name || null,
        farmName: animal.farm?.name || 'Authorized Farm',
        status: eligibility.status,
        lactating: animal.lactating,
        evaluatedAt: eligibility.evaluatedAt,
        eligibleFrom:
          eligibility.status === 'ELIGIBLE_FOR_MILK' ? eligibility.eligibilityDate : null,
        withdrawalEndsAt,
        blockers: eligibility.explanation?.blockers || [],
        ruleExplanation,
        disclaimer:
          'Public animal verification reflects live deterministic eligibility based on recorded veterinary treatment history and verified reference rules. It does not replace physical inspection or laboratory residue testing. Private clinical notes and farmer communications are protected and not disclosed.',
      },
    });
  }),
);
