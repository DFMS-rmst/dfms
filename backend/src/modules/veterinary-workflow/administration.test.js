import { describe, expect, it } from 'vitest';
import { administrationDeviates, validateAdministrationEvidence } from './administration.js';

const item = {
  id: 'item-1',
  drugId: 'drug-1',
  drugProductId: 'product-1',
  doseValue: 5,
  doseUnit: 'ml',
  route: 'INTRAMUSCULAR',
};
const input = {
  prescriptionItemId: 'item-1',
  drugId: 'drug-1',
  drugProductId: 'product-1',
  amount: 5,
  amountUnit: 'ml',
  route: 'INTRAMUSCULAR',
  administeredAt: new Date('2026-09-23T08:00:00Z'),
};

describe('administration evidence validation', () => {
  it('accepts actual evidence matching its prescription item', () => {
    expect(
      validateAdministrationEvidence(item, input, new Date('2026-09-23T09:00:00Z')),
    ).toEqual({ deviates: false });
  });

  it('rejects a missing or unrelated prescription item', () => {
    expect(() => validateAdministrationEvidence(null, input)).toThrow(
      'Prescription item does not belong to this treatment',
    );
  });

  it('rejects a client drug that differs from the prescription item', () => {
    expect(() =>
      validateAdministrationEvidence(item, { ...input, drugId: 'drug-2' }),
    ).toThrow('Drug does not match the selected prescription item');
  });

  it('requires a reason for amount, unit, route, or product deviation', () => {
    expect(administrationDeviates(item, { ...input, route: 'ORAL' })).toBe(true);
    expect(() =>
      validateAdministrationEvidence(item, { ...input, route: 'ORAL' }),
    ).toThrow('A reason is required');
    expect(
      validateAdministrationEvidence(item, {
        ...input,
        route: 'ORAL',
        deviationReason: 'Route changed during the recorded administration',
      }),
    ).toEqual({ deviates: true });
  });

  it('rejects an obviously future administration timestamp', () => {
    expect(() =>
      validateAdministrationEvidence(
        item,
        { ...input, administeredAt: new Date('2026-09-24T09:00:00Z') },
        new Date('2026-09-23T09:00:00Z'),
      ),
    ).toThrow('Administration time cannot be in the future');
  });
});
