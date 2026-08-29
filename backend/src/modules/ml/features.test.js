import { describe, expect, it } from 'vitest';
import { animalAmuFeatures } from './features.js';

describe('AMU ML feature extraction', () => {
  it('uses actual administrations and produces deterministic supported features', async () => {
    const now = new Date('2026-08-27T00:00:00Z');
    const rows = [
      {
        treatmentId: 't1',
        drugId: 'd1',
        administeredAt: new Date('2026-08-20T00:00:00Z'),
        drug: { antimicrobialClassId: 'c1' },
        treatment: {
          startedAt: new Date('2026-08-18T00:00:00Z'),
          completedAt: new Date('2026-08-20T00:00:00Z'),
          case: { diagnoses: [{ diseaseId: 'dx1' }] },
        },
      },
    ];
    const client = { treatmentAdministration: { findMany: async () => rows } };
    const features = await animalAmuFeatures('animal-1', now, client);
    expect(features.administrations_30d).toBe(1);
    expect(features.treatments_90d).toBe(1);
    expect(features.average_duration_days_90d).toBe(2);
    expect(features.distinct_classes_90d).toBe(1);
  });

  it('does not invent missing administration values', async () => {
    const client = { treatmentAdministration: { findMany: async () => [] } };
    const features = await animalAmuFeatures('animal-1', new Date('2026-08-27T00:00:00Z'), client);
    expect(features.administrations_90d).toBe(0);
    expect(features.average_duration_days_90d).toBe(0);
    expect(features.days_since_previous_treatment).toBe(365);
  });
});
