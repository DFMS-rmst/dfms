import { describe, expect, it } from 'vitest';
import {
  addWithdrawalDuration,
  calculateEligibility,
  reconcileCurrentEligibility,
  resolveRule,
} from './service.js';

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
      lactating: true,
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
  it('restores a reused historical hash as the only current eligibility row', async () => {
    const rows = [];
    const model = {
      findFirst: async ({ where }) =>
        rows.find((row) => row.animalId === where.animalId && row.isCurrent) || null,
      findUnique: async ({ where }) =>
        rows.find(
          (row) =>
            row.animalId === where.animalId_inputHash.animalId &&
            row.inputHash === where.animalId_inputHash.inputHash,
        ) || null,
      updateMany: async ({ where, data }) => {
        rows
          .filter((row) => row.animalId === where.animalId && row.isCurrent)
          .forEach((row) => Object.assign(row, data));
      },
      update: async ({ where, data }) => {
        const row = rows.find((entry) => entry.id === where.id);
        Object.assign(row, data);
        return row;
      },
      create: async ({ data }) => {
        const row = {
          ...data,
          id: `check-${rows.length + 1}`,
          isCurrent: true,
          treatmentEvaluations: [],
        };
        rows.push(row);
        return row;
      },
    };
    const tx = { milkEligibilityCheck: model };
    const calculated = (status) => ({
      animal: { farmId: 'farm-1' },
      status,
      evaluatedAt: new Date(),
      eligibilityDate: status === 'ELIGIBLE_FOR_MILK' ? new Date() : null,
      explanation: { blockers: [] },
      evaluations: [],
    });
    await reconcileCurrentEligibility(tx, {
      animalId: 'animal-1',
      inputHash: 'hash-a',
      calculated: calculated('TREATMENT_ACTIVE'),
      triggeredBy: 'A',
    });
    await reconcileCurrentEligibility(tx, {
      animalId: 'animal-1',
      inputHash: 'hash-b',
      calculated: calculated('ELIGIBLE_FOR_MILK'),
      triggeredBy: 'B',
    });
    await reconcileCurrentEligibility(tx, {
      animalId: 'animal-1',
      inputHash: 'hash-a',
      calculated: calculated('TREATMENT_ACTIVE'),
      triggeredBy: 'A_AGAIN',
    });
    expect(rows.filter((row) => row.isCurrent)).toHaveLength(1);
    expect(rows.find((row) => row.isCurrent).status).toBe('TREATMENT_ACTIVE');
    expect(rows.find((row) => row.isCurrent).inputHash).toBe('hash-a');
  });
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
  it('does not use a rule for the wrong product, route, jurisdiction, or formulation', () => {
    const base = {
      drugId: 'd1',
      drugProductId: 'p1',
      route: 'INTRAMUSCULAR',
      formulation: 'SUSPENSION_FOR_INJECTION_150_MG_PER_ML',
      jurisdiction: 'INDIA',
      administeredAt: new Date('2026-08-20T10:00:00Z'),
    };
    expect(resolveRule([exactRule], { ...base, drugProductId: null }).status).toBe(
      'RULE_NOT_FOUND',
    );
    expect(resolveRule([exactRule], { ...base, route: 'ORAL' }).status).toBe('RULE_NOT_FOUND');
    expect(resolveRule([exactRule], { ...base, jurisdiction: 'IRELAND' }).status).toBe(
      'RULE_NOT_FOUND',
    );
    expect(
      resolveRule([{ ...exactRule, formulation: 'SUSPENSION_FOR_INJECTION_150_MG_PER_ML' }], {
        ...base,
        formulation: 'TABLET',
      }).status,
    ).toBe('RULE_NOT_FOUND');
  });
  it('uses the last administration and the later treatment-completion anchor', async () => {
    const t = {
      id: 't1',
      status: 'COMPLETED',
      completedAt: new Date('2026-08-21T08:00:00Z'),
      administrations: [
        administration({ administeredAt: new Date('2026-08-19T10:00:00Z') }),
        administration({ administeredAt: new Date('2026-08-20T10:00:00Z') }),
      ],
    };
    const result = await calculateEligibility('a1', new Date('2026-08-21T09:00:00Z'), client([t]));
    expect(result.evaluations[0].lastAdministrationAt.toISOString()).toBe(
      '2026-08-20T10:00:00.000Z',
    );
    expect(result.evaluations[0].withdrawalEndsAt.toISOString()).toBe('2026-08-23T08:00:00.000Z');
  });
  it('ignores cancelled treatments only when no administration occurred', async () => {
    const none = await calculateEligibility(
      'a1',
      new Date('2026-08-30T00:00:00Z'),
      client([{ id: 'cancel-1', status: 'CANCELLED', completedAt: null, administrations: [] }]),
    );
    expect(none.status).toBe('ELIGIBLE_FOR_MILK');
    const exposed = await calculateEligibility(
      'a1',
      new Date('2026-08-21T00:00:00Z'),
      client([
        {
          id: 'cancel-2',
          status: 'CANCELLED',
          completedAt: null,
          administrations: [administration()],
        },
      ]),
    );
    expect(exposed.status).toBe('UNDER_WITHDRAWAL');
  });
  it('marks a non-lactating animal as not applicable and blocks automatic eligibility', async () => {
    const mock = client([]);
    mock.animal.findUnique = async () => ({
      id: 'a2',
      farmId: 'f1',
      speciesId: 's1',
      tagNumber: 'DRY-1',
      lactating: false,
      farm: {},
      treatments: [],
    });
    const result = await calculateEligibility('a2', new Date('2026-08-30T00:00:00Z'), mock);
    expect(result.applicable).toBe(false);
    expect(result.status).toBe('REVIEW_REQUIRED');
    expect(result.explanation.blockers).toContain('ANIMAL_NOT_LACTATING');
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
