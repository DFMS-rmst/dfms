import { prisma } from '../../infrastructure/prisma/client.js';

const decimal = (value) => (value == null ? null : Number(value));
const keyMonth = (date) => date.toISOString().slice(0, 7);

export async function getAmuDataset({ farmIds, start, end }, client = prisma) {
  return client.treatmentAdministration.findMany({
    where: {
      treatment: { farmId: { in: farmIds } },
      administeredAt: { ...(start ? { gte: start } : {}), ...(end ? { lte: end } : {}) },
      drug: { antimicrobialClassId: { not: null } },
    },
    include: {
      drug: { include: { antimicrobialClass: true } },
      animal: { include: { species: true } },
      treatment: {
        include: {
          farm: true,
          veterinarian: { include: { user: { select: { id: true, fullName: true } } } },
          case: {
            include: {
              diagnoses: { include: { disease: true }, orderBy: { diagnosedAt: 'desc' }, take: 1 },
            },
          },
        },
      },
    },
  });
}

export function aggregateAmu(rows, animalCount) {
  const treatments = new Map();
  const animals = new Set();
  const treatmentDays = new Set();
  let activeMg = 0;
  let massRecords = 0;
  for (const row of rows) {
    treatments.set(row.treatmentId, row.treatment);
    animals.add(row.animalId);
    treatmentDays.add(`${row.animalId}:${row.administeredAt.toISOString().slice(0, 10)}`);
    if (row.activeIngredientMg != null) {
      activeMg += decimal(row.activeIngredientMg);
      massRecords += 1;
    }
  }
  const completed = [...treatments.values()].filter(
    (x) => x.status === 'COMPLETED' && x.startedAt && x.completedAt,
  );
  const durations = completed.map((x) => (x.completedAt - x.startedAt) / 86_400_000);
  return {
    methodologyVersion: 'SIH-AMU-1.0',
    totalAdministrations: rows.length,
    totalAntimicrobialTreatments: treatments.size,
    treatedAnimals: animals.size,
    farmAnimals: animalCount,
    animalsTreatedPercentage: animalCount ? (animals.size / animalCount) * 100 : 0,
    antimicrobialTreatmentDays: treatmentDays.size,
    completedCourses: completed.length,
    averageTreatmentDurationDays: durations.length
      ? durations.reduce((a, b) => a + b, 0) / durations.length
      : null,
    activeIngredientMass: massRecords
      ? {
          status: 'AVAILABLE',
          value: activeMg,
          unit: 'MG_ACTIVE_INGREDIENT',
          recordsWithInput: massRecords,
          totalRecords: rows.length,
        }
      : {
          status: 'METRIC_NOT_AVAILABLE',
          reason: 'No validated active-ingredient mass/conversion was recorded.',
        },
    mgPerKgLiveweight: {
      status: 'METRIC_NOT_AVAILABLE',
      reason: 'A matched population liveweight denominator is unavailable.',
    },
    treatmentIncidence: {
      status: 'METRIC_NOT_AVAILABLE',
      reason: 'Animal-days-at-risk and validated antimicrobial coverage days are unavailable.',
    },
    dddvet: {
      status: 'METRIC_NOT_AVAILABLE',
      reason: 'No versioned DDDvet mapping and matched biomass denominator are configured.',
    },
  };
}

export function groupAmu(rows, dimension) {
  const groups = new Map();
  const dimensions = {
    drug: (x) => [x.drug.id, x.drug.canonicalName],
    class: (x) => [x.drug.antimicrobialClass.id, x.drug.antimicrobialClass.canonicalName],
    species: (x) => [x.animal.species.id, x.animal.species.canonicalName],
    disease: (x) => {
      const d = x.treatment.case.diagnoses[0]?.disease;
      return [d?.id || 'UNSPECIFIED', d?.canonicalName || 'Unspecified'];
    },
    farm: (x) => [x.treatment.farm.id, x.treatment.farm.name],
    veterinarian: (x) => [x.treatment.veterinarian.id, x.treatment.veterinarian.user.fullName],
  };
  for (const row of rows) {
    const [id, name] = dimensions[dimension](row);
    const group = groups.get(id) || {
      id,
      name,
      administrations: 0,
      treatments: new Set(),
      animals: new Set(),
      activeIngredientMg: 0,
      massRecords: 0,
    };
    group.administrations += 1;
    group.treatments.add(row.treatmentId);
    group.animals.add(row.animalId);
    if (row.activeIngredientMg != null) {
      group.activeIngredientMg += decimal(row.activeIngredientMg);
      group.massRecords += 1;
    }
    groups.set(id, group);
  }
  return [...groups.values()]
    .map((x) => ({
      id: x.id,
      name: x.name,
      administrations: x.administrations,
      treatments: x.treatments.size,
      treatedAnimals: x.animals.size,
      activeIngredientMass: x.massRecords
        ? { status: 'AVAILABLE', value: x.activeIngredientMg, unit: 'MG_ACTIVE_INGREDIENT' }
        : { status: 'METRIC_NOT_AVAILABLE' },
    }))
    .sort((a, b) => b.administrations - a.administrations);
}

export function monthlyTrend(rows) {
  const groups = new Map();
  for (const row of rows) {
    const month = keyMonth(row.administeredAt);
    const group = groups.get(month) || {
      month,
      administrations: 0,
      treatments: new Set(),
      animals: new Set(),
    };
    group.administrations += 1;
    group.treatments.add(row.treatmentId);
    group.animals.add(row.animalId);
    groups.set(month, group);
  }
  return [...groups.values()]
    .map((x) => ({
      month: x.month,
      administrations: x.administrations,
      treatments: x.treatments.size,
      treatedAnimals: x.animals.size,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));
}
