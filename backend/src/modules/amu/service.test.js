import { describe, expect, it } from 'vitest';
import { aggregateAmu, groupAmu, monthlyTrend } from './service.js';

const treatment = (id, status = 'COMPLETED') => ({
  id,
  status,
  startedAt: new Date('2026-08-01T00:00:00Z'),
  completedAt: new Date('2026-08-03T00:00:00Z'),
  farm: { id: 'farm-1', name: 'Farm' },
  veterinarian: { id: 'vet-1', user: { fullName: 'Vet' } },
  case: { diagnoses: [] },
});
const row = (id, animalId, drugName, className, at, mg = null) => ({
  id,
  treatmentId: `t-${id}`,
  animalId,
  administeredAt: new Date(at),
  activeIngredientMg: mg,
  drug: {
    id: drugName,
    canonicalName: drugName,
    antimicrobialClass: { id: className, canonicalName: className },
  },
  animal: { species: { id: 'cattle', canonicalName: 'Cattle' } },
  treatment: treatment(`t-${id}`),
});

describe('AMU methodology', () => {
  it('counts actual administrations, treatments, animals, days and supported mass only', () => {
    const rows = [
      row('1', 'a1', 'Amoxicillin', 'Penicillins', '2026-08-01T10:00:00Z', 100),
      row('2', 'a2', 'Oxytetracycline', 'Tetracyclines', '2026-08-02T10:00:00Z'),
    ];
    const result = aggregateAmu(rows, 4);
    expect(result.totalAdministrations).toBe(2);
    expect(result.totalAntimicrobialTreatments).toBe(2);
    expect(result.treatedAnimals).toBe(2);
    expect(result.animalsTreatedPercentage).toBe(50);
    expect(result.activeIngredientMass.value).toBe(100);
    expect(result.mgPerKgLiveweight.status).toBe('METRIC_NOT_AVAILABLE');
  });
  it('does not count prescriptions because only administration rows enter the pipeline', () => {
    expect(aggregateAmu([], 10).totalAdministrations).toBe(0);
    expect(aggregateAmu([], 10).totalAntimicrobialTreatments).toBe(0);
  });
  it('groups by drug/class and produces monthly trends', () => {
    const rows = [
      row('1', 'a1', 'Amoxicillin', 'Penicillins', '2026-07-31T23:00:00Z'),
      row('2', 'a2', 'Amoxicillin', 'Penicillins', '2026-08-01T01:00:00Z'),
    ];
    expect(groupAmu(rows, 'drug')[0].administrations).toBe(2);
    expect(groupAmu(rows, 'class')[0].name).toBe('Penicillins');
    expect(monthlyTrend(rows)).toHaveLength(2);
  });
});
