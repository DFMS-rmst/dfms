import { describe, expect, it } from 'vitest';
import { addWithdrawalDuration, calculateEligibility, resolveRule } from './service.js';

const exactRule = {
  id: 'r1',
  drugId: 'd1',
  drugProductId: 'p1',
  jurisdiction: 'INDIA',
  route: 'INTRAMUSCULAR',
  verificationStatus: 'VERIFIED',
  durationValue: 48,
  durationUnit: 'HOUR',
  ruleType: 'PRODUCT_SPECIFIC_EXACT',
  code: 'R',
  version: 1,
  source: { organization: 'Authority', title: 'Label', url: 'https://example.test' },
};
const client = (treatments, rules = [exactRule]) => ({
  animal: {
    findUnique: async () => ({
      id: 'a1',
      farmId: 'f1',
      speciesId: 's1',
      tagNumber: 'COW-1',
      farm: {},
      treatments,
    }),
  },
  withdrawalRule: { findMany: async () => rules },
});
const administration = (overrides = {}) => ({
  drugId: 'd1',
  drugProductId: 'p1',
  route: 'INTRAMUSCULAR',
  administeredAt: new Date('2026-08-20T10:00:00Z'),
  ...overrides,
});

describe('withdrawal and milk eligibility rules', () => {
  it('uses timezone-safe exact duration boundaries', () => {
    expect(addWithdrawalDuration(new Date('2026-08-20T10:00:00Z'), 48, 'HOUR').toISOString()).toBe(
      '2026-08-22T10:00:00.000Z',
    );
    expect(() => addWithdrawalDuration(new Date('invalid'), 1, 'DAY')).toThrow();
  });
  it('blocks active treatment', async () => {
    const result = await calculateEligibility(
      'a1',
      new Date('2026-08-30T00:00:00Z'),
      client([{ id: 't1', status: 'ACTIVE', administrations: [] }]),
    );
    expect(result.status).toBe('TREATMENT_ACTIVE');
  });
  it('calculates valid withdrawal and becomes eligible at the boundary', async () => {
    const t = {
      id: 't1',
      status: 'COMPLETED',
      completedAt: new Date('2026-08-20T10:00:00Z'),
      administrations: [administration()],
    };
    expect(
      (await calculateEligibility('a1', new Date('2026-08-21T00:00:00Z'), client([t]))).status,
    ).toBe('UNDER_WITHDRAWAL');
    expect(
      (await calculateEligibility('a1', new Date('2026-08-22T10:00:00Z'), client([t]))).status,
    ).toBe('ELIGIBLE_FOR_MILK');
  });
  it('uses the latest end across overlapping treatments', async () => {
    const secondRule = {
      ...exactRule,
      id: 'r2',
      drugId: 'd2',
      drugProductId: 'p2',
      durationValue: 72,
    };
    const treatments = [
      {
        id: 't1',
        status: 'COMPLETED',
        completedAt: new Date('2026-08-20T10:00:00Z'),
        administrations: [administration()],
      },
      {
        id: 't2',
        status: 'COMPLETED',
        completedAt: new Date('2026-08-20T10:00:00Z'),
        administrations: [administration({ drugId: 'd2', drugProductId: 'p2' })],
      },
    ];
    const result = await calculateEligibility(
      'a1',
      new Date('2026-08-21T00:00:00Z'),
      client(treatments, [exactRule, secondRule]),
    );
    expect(result.eligibilityDate.toISOString()).toBe('2026-08-23T10:00:00.000Z');
  });
  it('fails safe for missing and review-only rules', () => {
    expect(
      resolveRule([], { drugId: 'x', drugProductId: null, route: 'ORAL', jurisdiction: 'INDIA' })
        .status,
    ).toBe('RULE_NOT_FOUND');
    expect(
      resolveRule([{ ...exactRule, verificationStatus: 'REVIEW_REQUIRED' }], {
        drugId: 'd1',
        drugProductId: 'p1',
        route: 'INTRAMUSCULAR',
        jurisdiction: 'INDIA',
      }).status,
    ).toBe('REVIEW_REQUIRED');
  });
  it('does not create withdrawal for completed treatment with no administration', async () => {
    const result = await calculateEligibility(
      'a1',
      new Date('2026-08-30T00:00:00Z'),
      client([{ id: 't1', status: 'COMPLETED', completedAt: new Date(), administrations: [] }]),
    );
    expect(result.status).toBe('ELIGIBLE_FOR_MILK');
  });
});
