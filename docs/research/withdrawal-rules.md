# Milk Withdrawal Rules

## India rule hierarchy

1. Use the reviewed label of the **actual Indian-authorized product** for its species, route, formulation, dose/use conditions, and label version.
2. Rule 97(3A) requires that label and states that, when a specific withdrawal period has not been validated, the withdrawal period must be **not less than seven days for milk/eggs**.
3. The generic seven-day provision is stored as `MINIMUM_ONLY`. It may support a conservative configured decision only when a domain reviewer confirms the actual label/use context. It is not an ingredient-specific exact rule.
4. If product identity, label, buffalo applicability, route/formulation, dose conditions, or jurisdiction is unresolved, return `RULE_NOT_FOUND` or `REVIEW_REQUIRED` and block certification.

## Machine-readable rule types

- `PRODUCT_SPECIFIC_EXACT`: exact authorized product information for the stated jurisdiction and conditions.
- `STATUTORY_MINIMUM`: a lower bound, not automatically interchangeable with an exact product rule.
- `NOT_AUTHORIZED_FOR_MILK`: use in animals producing milk for human consumption is excluded.
- `RULE_NOT_FOUND`: no adequate evidence.

## Curated rule records

The dataset contains five records:

- One Indian statutory minimum: 7 days, cattle/buffalo as food-producing animals, milk, `MINIMUM_ONLY`, `REVIEW_REQUIRED_FOR_CERTIFICATE`.
- Lamoxsan 150 mg/ml amoxicillin IM cattle: 72 hours, Ireland.
- Redymox 150 mg/ml amoxicillin IM/SC cattle: 48 hours, Ireland.
- OXTRA DD 100 mg/ml oxytetracycline IM/IV cattle under the documented 24-hour regimen: 72 hours, Belgium.
- Ceftiosan/Alfacef RTU 50 mg/ml ceftiofur SC cattle: 0 hours, listed EU jurisdictions.

The foreign rules are valid examples for schema/tests and a jurisdiction-explicit academic demonstration. They are **not valid Indian fallback rules**. Their differences deliberately test that product identity outranks ingredient matching.

## Calculation policy

Withdrawal begins at the actual last administration instant unless the authoritative rule defines another anchor (for example, calving/milking count). Convert duration without rounding away source precision. Store the original value/unit and computed timestamp. The eligibility boundary should be `evaluation_time >= withdrawal_end`, subject to all other blockers and a reviewed time-zone policy.

## Required context

Rule ID/version, product/authorization, active ingredients, species and production class, milk product, route, formulation/concentration, dose/use conditions, duration/unit, exact/minimum flag, jurisdiction, source organization/title/URL/section, source effective/revision/retrieval dates, verification status, reviewer, and applicability notes.
