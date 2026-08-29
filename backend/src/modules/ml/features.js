import { prisma } from '../../infrastructure/prisma/client.js';

const DAY = 86_400_000;
const since = (now, days) => new Date(now.getTime() - days * DAY);

export async function animalAmuFeatures(animalId, now = new Date(), client = prisma) {
  const rows = await client.treatmentAdministration.findMany({
    where: {
      animalId,
      administeredAt: { gte: since(now, 90), lte: now },
      drug: { antimicrobialClassId: { not: null } },
    },
    include: {
      drug: true,
      treatment: { include: { case: { include: { diagnoses: true } } } },
    },
    orderBy: { administeredAt: 'asc' },
  });
  const treatmentMap = new Map(rows.map((row) => [row.treatmentId, row.treatment]));
  const treatments = [...treatmentMap.values()];
  const recent30 = rows.filter((row) => row.administeredAt >= since(now, 30));
  const treatments30 = new Set(recent30.map((row) => row.treatmentId));
  const drugs = new Set(rows.map((row) => row.drugId));
  const classes = new Set(rows.map((row) => row.drug.antimicrobialClassId));
  const completed = treatments.filter((item) => item.startedAt && item.completedAt);
  const durations = completed.map((item) => (item.completedAt - item.startedAt) / DAY);
  const diagnoses = treatments.map((item) => item.case.diagnoses[0]?.diseaseId).filter(Boolean);
  const last = treatments
    .map((item) => item.completedAt || item.startedAt)
    .filter(Boolean)
    .sort((a, b) => b - a);
  return {
    treatments_30d: treatments30.size,
    treatments_90d: treatments.length,
    administrations_30d: recent30.length,
    administrations_90d: rows.length,
    distinct_drugs_90d: drugs.size,
    distinct_classes_90d: classes.size,
    treatment_days_90d: new Set(rows.map((row) => row.administeredAt.toISOString().slice(0, 10)))
      .size,
    average_duration_days_90d: durations.length
      ? durations.reduce((sum, value) => sum + value, 0) / durations.length
      : 0,
    same_drug_repeat_90d: Math.max(0, treatments.length - drugs.size),
    same_class_repeat_90d: Math.max(0, treatments.length - classes.size),
    repeat_episode_ratio_90d: diagnoses.length ? 1 - new Set(diagnoses).size / diagnoses.length : 0,
    days_since_previous_treatment: last.length ? Math.max(0, (now - last[0]) / DAY) : 365,
  };
}

export async function farmAmuFeatures(farmId, now = new Date(), client = prisma) {
  const animals = await client.animal.findMany({
    where: { farmId, status: 'ACTIVE' },
    select: { id: true },
  });
  const vectors = await Promise.all(
    animals.map((animal) => animalAmuFeatures(animal.id, now, client)),
  );
  if (!vectors.length)
    return Object.fromEntries(
      Object.keys(await animalAmuFeatures('__none__', now, client)).map((key) => [
        key,
        key === 'days_since_previous_treatment' ? 365 : 0,
      ]),
    );
  return Object.fromEntries(
    Object.keys(vectors[0]).map((key) => [
      key,
      vectors.reduce((sum, vector) => sum + vector[key], 0) / vectors.length,
    ]),
  );
}
