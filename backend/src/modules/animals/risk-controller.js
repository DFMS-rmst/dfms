import { AppError } from '../../common/errors.js';
import { prisma } from '../../infrastructure/prisma/client.js';
import { predictAnimalRisk } from '../ml/client.js';

const DAY_MS = 1000 * 60 * 60 * 24;

const DEFAULT_WEIGHTS = {
  Cow: 450,
  Buffalo: 500,
  Goat: 45,
  Sheep: 55,
  Chicken: 2,
};

function normalizeSpecies(raw) {
  if (!raw) return 'Cow';
  const str = String(raw).toLowerCase();
  if (str.includes('buffalo')) return 'Buffalo';
  if (str.includes('goat')) return 'Goat';
  if (str.includes('sheep')) return 'Sheep';
  if (str.includes('chicken') || str.includes('poultry')) return 'Chicken';
  return 'Cow';
}

/**
 * Express controller for GET /api/animals/:id/risk
 * Dynamically computes ML inputs from animal DB profile & treatment history,
 * applies smart hybrid logic, and returns the risk level badge.
 */
export async function getAnimalRiskController(request, response) {
  const animalId = request.params.id || request.params.animalId;
  if (!animalId) {
    throw new AppError(400, 'ANIMAL_ID_REQUIRED', 'Animal ID is required');
  }

  const now = new Date();

  // 1. Fetch Animal Data from DB
  const animal = await prisma.animal.findUnique({
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

  // Extract species (e.g., 'Cow', 'Buffalo')
  const species = normalizeSpecies(animal.species?.canonicalName || animal.species?.name);

  // Calculate age_years using dateOfBirth vs today
  let age_years = 3.5;
  if (animal.dateOfBirth) {
    const ageDays = (now.getTime() - new Date(animal.dateOfBirth).getTime()) / DAY_MS;
    age_years = Math.max(0.1, Number((ageDays / 365.25).toFixed(1)));
  }

  // Map estimatedWeightKg to weight_kg
  const defaultWeight = DEFAULT_WEIGHTS[species] || 450;
  const weight_kg = Number(animal.estimatedWeightKg || animal.weightKg || defaultWeight);

  // 2. Fetch Treatment History using ORM
  const thirtyDaysAgo = new Date(now.getTime() - 30 * DAY_MS);
  const ninetyDaysAgo = new Date(now.getTime() - 90 * DAY_MS);

  // Count treatments in last 30 days & last 90 days
  const treatmentCount30 = await prisma.treatment.count({
    where: {
      animalId,
      createdAt: { gte: thirtyDaysAgo },
    },
  });

  const treatmentCount90 = await prisma.treatment.count({
    where: {
      animalId,
      createdAt: { gte: ninetyDaysAgo },
    },
  });

  // Also include any treatment administrations directly recorded
  const adminCount30 = await prisma.treatmentAdministration.count({
    where: {
      animalId,
      administeredAt: { gte: thirtyDaysAgo },
    },
  });

  const adminCount90 = await prisma.treatmentAdministration.count({
    where: {
      animalId,
      administeredAt: { gte: ninetyDaysAgo },
    },
  });

  const treatment_last_30d = Math.max(treatmentCount30, adminCount30);
  const treatment_last_90d = Math.max(treatmentCount90, adminCount90, treatment_last_30d);

  // Days between today and the most recent treatment date
  const mostRecentTreatment = await prisma.treatment.findFirst({
    where: { animalId },
    orderBy: { createdAt: 'desc' },
  });

  const mostRecentAdmin = await prisma.treatmentAdministration.findFirst({
    where: { animalId },
    orderBy: { administeredAt: 'desc' },
  });

  let mostRecentDate = null;
  if (mostRecentTreatment) {
    mostRecentDate =
      mostRecentTreatment.completedAt ||
      mostRecentTreatment.startedAt ||
      mostRecentTreatment.createdAt;
  }
  if (mostRecentAdmin?.administeredAt) {
    if (!mostRecentDate || new Date(mostRecentAdmin.administeredAt) > new Date(mostRecentDate)) {
      mostRecentDate = mostRecentAdmin.administeredAt;
    }
  }

  let days_since_last_treatment = 999;
  if (mostRecentDate) {
    const diffMs = now.getTime() - new Date(mostRecentDate).getTime();
    days_since_last_treatment = Math.max(0, Math.floor(diffMs / DAY_MS));
  }

  // 3. Apply Smart Hybrid Logic
  let unique_antimicrobial_classes_90d;
  let total_antimicrobial_days_90d;
  let max_repeated_class_count_90d;

  if (treatment_last_90d === 0) {
    unique_antimicrobial_classes_90d = 0;
    total_antimicrobial_days_90d = 0;
    max_repeated_class_count_90d = 0;
    days_since_last_treatment = 999;
  } else {
    unique_antimicrobial_classes_90d = 1;
    max_repeated_class_count_90d = 1;
    total_antimicrobial_days_90d = treatment_last_90d * 3;
  }

  // Constants
  const mean_treatment_interval_days = 0;
  const recurrent_condition_events_90d = 0;
  const no_response_events_90d = 0;
  const partial_response_events_90d = 0;

  const mlInputs = {
    species,
    age_years,
    weight_kg,
    treatment_last_30d,
    treatment_last_90d,
    treatments_last_30d: treatment_last_30d,
    treatments_last_90d: treatment_last_90d,
    days_since_last_treatment,
    unique_antimicrobial_classes_90d,
    total_antimicrobial_days_90d,
    max_repeated_class_count_90d,
    mean_treatment_interval_days,
    recurrent_condition_events_90d,
    no_response_events_90d,
    partial_response_events_90d,
  };

  // Evaluate Risk Level: Try ML microservice, fallback to deterministic hybrid rules
  let riskLevel = 'LOW';
  let riskScore = 0.1;
  let probabilities = { LOW: 0.95, MEDIUM: 0.04, HIGH: 0.01 };

  try {
    const mlResult = await predictAnimalRisk(mlInputs);
    if (mlResult?.prediction) {
      riskLevel = String(mlResult.prediction).toUpperCase();
      probabilities = mlResult.probabilities || probabilities;
      riskScore = mlResult.risk_score ?? probabilities[riskLevel] ?? 0.5;
    }
  } catch {
    // Smart Hybrid Rule fallback:
    if (treatment_last_90d === 0) {
      riskLevel = 'LOW';
      riskScore = 0.08;
      probabilities = { LOW: 0.95, MEDIUM: 0.04, HIGH: 0.01 };
    } else if (
      treatment_last_30d >= 2 ||
      treatment_last_90d >= 3 ||
      days_since_last_treatment <= 7
    ) {
      riskLevel = 'HIGH';
      riskScore = 0.85;
      probabilities = { LOW: 0.05, MEDIUM: 0.15, HIGH: 0.8 };
    } else {
      riskLevel = 'MEDIUM';
      riskScore = 0.5;
      probabilities = { LOW: 0.2, MEDIUM: 0.7, HIGH: 0.1 };
    }
  }

  const riskLabel = riskLevel === 'HIGH' ? 'High' : riskLevel === 'MEDIUM' ? 'Medium' : 'Low';
  const icon = riskLevel === 'HIGH' ? '🔴' : riskLevel === 'MEDIUM' ? '🟡' : '🟢';
  const color = riskLevel === 'HIGH' ? '#dc2626' : riskLevel === 'MEDIUM' ? '#d97706' : '#16a34a';

  return response.json({
    data: {
      animalId: animal.id,
      tagNumber: animal.tagNumber,
      name: animal.name,
      species,
      riskLevel,
      risk: riskLabel,
      level: riskLevel,
      icon,
      color,
      badgeText: `${icon} ${riskLabel}`,
      probabilities,
      riskScore,
      inputs: mlInputs,
    },
    riskLevel,
    risk: riskLabel,
    level: riskLevel,
    icon,
    color,
    badgeText: `${icon} ${riskLabel}`,
    inputs: mlInputs,
  });
}
