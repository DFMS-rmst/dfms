import { prisma } from '../../infrastructure/prisma/client.js';
import { AppError } from '../../common/errors.js';
import { predictAnimalRisk } from './client.js';

const SPECIES_MAP = {
  cattle: 'Cow',
  cow: 'Cow',
  buffalo: 'Buffalo',
  goat: 'Goat',
  sheep: 'Sheep',
  chicken: 'Chicken',
  poultry: 'Chicken',
};

export function normalizeSpecies(rawSpecies) {
  if (!rawSpecies) return 'Cow';
  const key = String(rawSpecies).trim().toLowerCase();
  for (const [pattern, target] of Object.entries(SPECIES_MAP)) {
    if (key.includes(pattern)) return target;
  }
  return 'Cow';
}

const DEFAULT_WEIGHTS = {
  Cow: 450,
  Buffalo: 500,
  Goat: 45,
  Sheep: 50,
  Chicken: 2.5,
};

const DAY_MS = 86_400_000;
const daysAgo = (now, days) => new Date(now.getTime() - days * DAY_MS);

/**
 * Pre-computes intelligent default parameters for an animal from its actual
 * database profile and treatment history.
 */
export async function computeAnimalRiskDefaults(animalId, now = new Date(), client = prisma) {
  const animal = await client.animal.findUnique({
    where: { id: animalId },
    include: {
      species: true,
      breed: true,
      farm: true,
    },
  });

  if (!animal) {
    throw new AppError(404, 'ANIMAL_NOT_FOUND', 'Animal not found');
  }

  const species = normalizeSpecies(animal.species?.canonicalName);

  // Age in years
  let ageYears = 3.5;
  if (animal.dateOfBirth) {
    const ageDays = (now.getTime() - new Date(animal.dateOfBirth).getTime()) / DAY_MS;
    ageYears = Math.max(0.1, Number((ageDays / 365.25).toFixed(1)));
  }

  const defaultWeight = DEFAULT_WEIGHTS[species] || 450;

  // Retrieve actual treatment administrations in last 90 days
  const administrations = await client.treatmentAdministration.findMany({
    where: {
      animalId,
      administeredAt: { gte: daysAgo(now, 90), lte: now },
    },
    include: {
      medicine: true,
      treatment: true,
    },
    orderBy: { administeredAt: 'asc' },
  });

  const recent30 = administrations.filter((a) => a.administeredAt >= daysAgo(now, 30));

  // Treatment courses (distinct treatment records)
  const treatments90 = new Set(administrations.map((a) => a.treatmentId));
  const treatments30 = new Set(recent30.map((a) => a.treatmentId));

  // Days since last treatment
  const lastAdmin = await client.treatmentAdministration.findFirst({
    where: { animalId },
    orderBy: { administeredAt: 'desc' },
  });

  let daysSinceLast = 90;
  if (lastAdmin) {
    const diff = (now.getTime() - new Date(lastAdmin.administeredAt).getTime()) / DAY_MS;
    daysSinceLast = Math.max(0, Math.floor(diff));
  } else {
    // If never treated, set to a safe number within animal lifespan
    const maxDaysAlive = Math.floor(ageYears * 365.25);
    daysSinceLast = Math.min(365, maxDaysAlive);
  }

  // Antimicrobial classes
  const classes90 = administrations.map((a) => a.medicine?.antimicrobialClass).filter(Boolean);
  const uniqueClassesCount = new Set(classes90).size;

  // Max repeated class count
  const classFreq = {};
  for (const c of classes90) {
    classFreq[c] = (classFreq[c] || 0) + 1;
  }
  const maxRepeatedClass = Object.values(classFreq).length
    ? Math.max(...Object.values(classFreq))
    : 0;

  // Distinct treatment days in 90d
  const distinctDays90 = new Set(
    administrations.map((a) => a.administeredAt.toISOString().slice(0, 10)),
  ).size;

  // Mean interval between administrations
  let meanInterval = 0;
  if (administrations.length > 1) {
    let totalIntervalDays = 0;
    for (let i = 1; i < administrations.length; i++) {
      totalIntervalDays +=
        (administrations[i].administeredAt.getTime() -
          administrations[i - 1].administeredAt.getTime()) /
        DAY_MS;
    }
    meanInterval = Number((totalIntervalDays / (administrations.length - 1)).toFixed(1));
  } else if (administrations.length === 1) {
    meanInterval = 14.0;
  }

  // Ensure logical consistency
  const treatmentsLast30d = treatments30.size;
  const treatmentsLast90d = Math.max(treatmentsLast30d, treatments90.size);

  let adjustedDaysSinceLast = daysSinceLast;
  if (treatmentsLast30d > 0 && adjustedDaysSinceLast > 30) {
    adjustedDaysSinceLast = 10;
  }

  return {
    animal: {
      id: animal.id,
      tagNumber: animal.tagNumber,
      name: animal.name,
      speciesCanonical: animal.species?.canonicalName,
      status: animal.status,
      farmId: animal.farmId,
      farmName: animal.farm?.name,
    },
    defaults: {
      species,
      age_years: ageYears,
      weight_kg: defaultWeight,
      treatments_last_30d: treatmentsLast30d,
      treatments_last_90d: treatmentsLast90d,
      days_since_last_treatment: adjustedDaysSinceLast,
      unique_antimicrobial_classes_90d: Math.min(uniqueClassesCount, treatmentsLast90d),
      max_repeated_class_count_90d: Math.min(maxRepeatedClass, treatmentsLast90d),
      mean_treatment_interval_days: meanInterval,
      total_antimicrobial_days_90d: Math.min(distinctDays90, 90),
      recurrent_condition_events_90d: 0,
      no_response_events_90d: 0,
      partial_response_events_90d: 0,
    },
  };
}

/**
 * Executes animal risk prediction and records an official risk assessment.
 */
export async function recordAnimalRiskAssessment(
  { animalId, caseId = null, userId, data },
  client = prisma,
) {
  const animal = await client.animal.findUnique({
    where: { id: animalId },
    include: { farm: true },
  });

  if (!animal) {
    throw new AppError(404, 'ANIMAL_NOT_FOUND', 'Animal not found');
  }

  // Find veterinarian profile if user is a veterinarian
  const vetProfile = await client.veterinarianProfile.findUnique({
    where: { userId },
  });

  // Prepare prediction payload with strict numbers
  const predictionPayload = {
    species: data.species || 'Cow',
    age_years: Number(data.age_years),
    weight_kg: Number(data.weight_kg),
    treatments_last_30d: Math.round(Number(data.treatments_last_30d)),
    treatments_last_90d: Math.round(Number(data.treatments_last_90d)),
    days_since_last_treatment: Math.round(Number(data.days_since_last_treatment)),
    unique_antimicrobial_classes_90d: Math.round(Number(data.unique_antimicrobial_classes_90d)),
    max_repeated_class_count_90d: Math.round(Number(data.max_repeated_class_count_90d)),
    mean_treatment_interval_days: Number(data.mean_treatment_interval_days),
    total_antimicrobial_days_90d: Math.round(Number(data.total_antimicrobial_days_90d)),
    recurrent_condition_events_90d: Math.round(Number(data.recurrent_condition_events_90d || 0)),
    no_response_events_90d: Math.round(Number(data.no_response_events_90d || 0)),
    partial_response_events_90d: Math.round(Number(data.partial_response_events_90d || 0)),
  };

  // Call the Random Forest ML service
  const predictionResult = await predictAnimalRisk(predictionPayload);

  const predictedRisk = predictionResult.prediction || 'LOW';
  const probabilities = predictionResult.probabilities || {};

  // Store in database
  const assessment = await client.animalRiskAssessment.create({
    data: {
      animalId,
      caseId: caseId || null,
      veterinarianId: vetProfile?.id || null,
      createdById: userId,
      species: predictionPayload.species,
      ageYears: predictionPayload.age_years,
      weightKg: predictionPayload.weight_kg,
      treatmentsLast30d: predictionPayload.treatments_last_30d,
      treatmentsLast90d: predictionPayload.treatments_last_90d,
      daysSinceLastTreatment: predictionPayload.days_since_last_treatment,
      uniqueAntimicrobialClasses90d: predictionPayload.unique_antimicrobial_classes_90d,
      maxRepeatedClassCount90d: predictionPayload.max_repeated_class_count_90d,
      meanTreatmentIntervalDays: predictionPayload.mean_treatment_interval_days,
      totalAntimicrobialDays90d: predictionPayload.total_antimicrobial_days_90d,
      recurrentConditionEvents90d: predictionPayload.recurrent_condition_events_90d,
      noResponseEvents90d: predictionPayload.no_response_events_90d,
      partialResponseEvents90d: predictionPayload.partial_response_events_90d,
      predictedRisk,
      probabilities,
      notes: data.notes || null,
      recommendations: data.recommendations || null,
    },
    include: {
      animal: { include: { species: true } },
      veterinarian: { include: { user: true } },
      createdBy: { select: { id: true, fullName: true, email: true } },
    },
  });

  // Record an animal profile event for the health timeline
  const confidencePercent = Math.round((probabilities[predictedRisk] || 0) * 100);
  await client.animalProfileEvent.create({
    data: {
      animalId,
      actorUserId: userId,
      eventType: 'ANIMAL_RISK_ASSESSED',
      summary: `Risk Assessment: ${predictedRisk} Risk (${confidencePercent}% probability)`,
      details: {
        assessmentId: assessment.id,
        predictedRisk,
        confidencePercent,
        species: predictionPayload.species,
        treatmentsLast90d: predictionPayload.treatments_last_90d,
        daysSinceLastTreatment: predictionPayload.days_since_last_treatment,
        notes: data.notes || '',
        recommendations: data.recommendations || '',
      },
    },
  });

  // If a case is linked, notify the case conversation
  if (caseId) {
    try {
      await client.caseMessage.create({
        data: {
          caseId,
          senderId: userId,
          body: `🩺 [Clinical Risk Assessment] Predicted Risk: ${predictedRisk} (${confidencePercent}% probability). Evaluated by veterinarian. Clinical risk report is available on the animal's profile.`,
        },
      });
    } catch {
      // Do not fail transaction if chat notification encounters an issue
    }
  }

  return assessment;
}

/**
 * Returns risk assessments for an animal.
 */
export async function getAnimalRiskHistory(animalId, client = prisma) {
  return client.animalRiskAssessment.findMany({
    where: { animalId },
    include: {
      veterinarian: { include: { user: true } },
      createdBy: { select: { id: true, fullName: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Returns latest risk assessment for an animal.
 */
export async function getLatestAnimalRisk(animalId, client = prisma) {
  return client.animalRiskAssessment.findFirst({
    where: { animalId },
    include: {
      veterinarian: { include: { user: true } },
      createdBy: { select: { id: true, fullName: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Returns risk assessments for a specific veterinary case.
 */
export async function getCaseRiskAssessments(caseId, client = prisma) {
  return client.animalRiskAssessment.findMany({
    where: { caseId },
    include: {
      veterinarian: { include: { user: true } },
      createdBy: { select: { id: true, fullName: true, email: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}
