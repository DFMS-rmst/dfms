import { describe, expect, it } from 'vitest';
import { manualRuleRecord, manualWithdrawalRuleSchema } from './reference-governance.js';

const valid = {
  code: 'MANUAL-REFERENCE-1',
  drugId: 'drug-1',
  drugProductId: 'product-1',
  speciesId: 'species-1',
  foodProduct: 'MILK',
  route: 'INTRAMUSCULAR',
  formulation: 'Referenced formulation',
  durationValue: 48,
  durationUnit: 'HOUR',
  jurisdiction: 'INDIA',
  organization: 'Source organization',
  sourceTitle: 'Source document',
  sourceUrl: 'https://example.test/source',
  sourceSection: 'Section 1',
  useConditions: 'Exact reviewed product conditions must be checked.',
};

describe('manual withdrawal-reference governance', () => {
  it('does not provide a default duration and requires provenance and exact product context', () => {
    expect(() => manualWithdrawalRuleSchema.parse({})).toThrow();
    expect(() => manualWithdrawalRuleSchema.parse({ ...valid, durationValue: undefined })).toThrow();
    expect(() => manualWithdrawalRuleSchema.parse({ ...valid, drugProductId: undefined })).toThrow();
    expect(() => manualWithdrawalRuleSchema.parse({ ...valid, sourceUrl: '' })).toThrow();
  });

  it('always creates a review-blocked record even if a caller submits VERIFIED', () => {
    const parsed = manualWithdrawalRuleSchema.parse({ ...valid, verificationStatus: 'VERIFIED' });
    const record = manualRuleRecord(parsed, 'source-1');
    expect(record.verificationStatus).toBe('REVIEW_REQUIRED');
    expect(record.certificateUse).toBe('BLOCK_UNTIL_INDEPENDENT_DOMAIN_REVIEW');
  });
});
