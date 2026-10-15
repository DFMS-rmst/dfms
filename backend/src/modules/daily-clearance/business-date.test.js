import { describe, expect, it } from 'vitest';
import { businessDateFor } from './business-date.js';
import { buildDailySnapshot } from './service.js';
import { hashDailySnapshot } from './canonical.js';

describe('daily milk collection business date and snapshot', () => {
  it('uses the farm timezone across the UTC date boundary', () => {
    const instant = new Date('2026-09-23T20:00:00.000Z');
    expect(businessDateFor(instant, 'Asia/Kolkata')).toBe('2026-09-24');
    expect(businessDateFor(instant, 'UTC')).toBe('2026-09-23');
  });

  it('selects eligibility from authoritative checks without manual input', () => {
    const checks = [
      {
        id: 'check-a',
        status: 'ELIGIBLE_FOR_MILK',
        evaluatedAt: new Date('2026-09-23T05:00:00Z'),
        eligibilityDate: new Date('2026-09-22T05:00:00Z'),
        explanation: {},
        treatmentEvaluations: [],
        animal: { id: 'animal-a', tagNumber: 'COW-1', name: 'Asha' },
      },
      {
        id: 'check-b',
        status: 'UNDER_WITHDRAWAL',
        evaluatedAt: new Date('2026-09-23T05:00:00Z'),
        eligibilityDate: new Date('2026-09-25T05:00:00Z'),
        explanation: { blockers: ['UNDER_WITHDRAWAL'] },
        treatmentEvaluations: [
          { status: 'UNDER_WITHDRAWAL', withdrawalEndsAt: new Date('2026-09-25T05:00:00Z') },
        ],
        animal: { id: 'animal-b', tagNumber: 'COW-2', name: null },
      },
    ];
    const snapshot = buildDailySnapshot(
      { id: 'farm-1', name: 'Demo Farm', timeZone: 'Asia/Kolkata' },
      '2026-09-23',
      checks,
      new Date('2026-09-23T05:00:00Z'),
    );
    expect(snapshot.applicableCount).toBe(2);
    expect(snapshot.eligibleCount).toBe(1);
    expect(snapshot.animals.find((item) => item.animalId === 'animal-b').blockingReason).toBe(
      'UNDER_WITHDRAWAL',
    );
    expect(hashDailySnapshot(snapshot)).toHaveLength(64);
  });
});
