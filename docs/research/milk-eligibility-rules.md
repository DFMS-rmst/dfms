# Milk Eligibility Rules

## Decision inputs

- Animal species and current lactation/production class
- Every relevant active/recent treatment and actual administration
- Actual product, ingredients, route, formulation, regimen/use conditions, jurisdiction, and label version
- Treatment/last-dose completion instant
- Matching verified withdrawal rule and provenance
- Certificate and treatment changes after prior evaluation

## Rule order

1. If an administration/course is active or its last dose is uncertain: `TREATMENT_ACTIVE`.
2. Resolve an exact applicable rule for every relevant treatment using product → species/production class → milk → route → formulation/concentration → use conditions → jurisdiction → effective version.
3. If prohibited/not authorized for lactating animals producing human-consumption milk: `REVIEW_REQUIRED` and block collection/certificate according to reviewed policy.
4. If no rule matches: `RULE_NOT_FOUND`.
5. If multiple same-jurisdiction, same-applicability rules conflict: `REVIEW_REQUIRED`/`CONFLICTING_SOURCE`.
6. If only a statutory minimum exists, apply it only under an approved conservative policy and retain `minimum_only`; otherwise require review. Do not call it a validated product-specific rule.
7. Compute each withdrawal end from its rule-defined anchor. If any end is in the future: `UNDER_WITHDRAWAL`.
8. Only when all relevant treatments are complete, all rules are verified/applicable, and all withdrawal ends have passed: `ELIGIBLE_FOR_MILK`.

## Aggregation

The effective animal withdrawal end is the maximum withdrawal end across all relevant treatments. The latest treatment is not necessarily the blocking treatment. Record the full blocker set and explanation.

## Certificate safeguards

Issue only from `ELIGIBLE_FOR_MILK`. A new administration, corrected treatment, rule revision, product-label invalidation, or other blocking condition triggers re-evaluation and revocation/supersession. Preserve old decisions and rule snapshots.

Required disclaimer: “This certificate represents eligibility based on recorded treatment history and configured withdrawal-period reference rules. It does not represent laboratory residue testing.”

MRL values never enter this decision calculation.
