import { z } from 'zod';

export const manualWithdrawalRuleSchema = z.object({
  code: z.string().trim().min(3).max(120),
  drugId: z.string(),
  drugProductId: z.string(),
  speciesId: z.string(),
  foodProduct: z.literal('MILK').default('MILK'),
  route: z.string().trim().min(2).max(100),
  formulation: z.string().trim().min(2).max(160),
  durationValue: z.coerce.number().nonnegative(),
  durationUnit: z.enum(['HOUR', 'DAY']),
  jurisdiction: z.string().trim().min(2).max(100),
  organization: z.string().trim().min(2).max(255),
  sourceTitle: z.string().trim().min(3).max(512),
  sourceUrl: z.string().url().max(1024),
  sourceSection: z.string().trim().min(1).max(255),
  effectiveFrom: z.coerce.date().optional().nullable(),
  useConditions: z.string().trim().min(3).max(2000),
});

export function manualRuleRecord(input, sourceId) {
  return {
    code: input.code,
    version: 1,
    drugId: input.drugId,
    drugProductId: input.drugProductId,
    speciesId: input.speciesId,
    foodProduct: input.foodProduct,
    route: input.route,
    formulation: input.formulation,
    useConditions: input.useConditions,
    durationValue: String(input.durationValue),
    durationUnit: input.durationUnit,
    durationQualifier: 'EXACT',
    jurisdiction: input.jurisdiction,
    sourceId,
    sourceSection: input.sourceSection,
    effectiveFrom: input.effectiveFrom,
    verificationStatus: 'REVIEW_REQUIRED',
    ruleType: 'PRODUCT_SPECIFIC_EXACT',
    certificateUse: 'BLOCK_UNTIL_INDEPENDENT_DOMAIN_REVIEW',
  };
}
