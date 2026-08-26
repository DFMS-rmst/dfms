# Milk Eligibility Engine

The backend answers whether milk is eligible from the animal based on recorded treatment history and verified withdrawal rules. It never claims laboratory residue safety.

## Decision order

All relevant treatments and all administered antimicrobials are evaluated. Blocking precedence is:

1. `TREATMENT_ACTIVE` while any treatment is planned/active.
2. `REVIEW_REQUIRED` for conflicting/review-only context.
3. `RULE_NOT_FOUND` when an exact applicable rule is absent.
4. `UNDER_WITHDRAWAL` while any verified withdrawal end remains in the future.
5. `ELIGIBLE_FOR_MILK` only when no blocker remains.

The effective eligibility date is the maximum withdrawal end across every applicable treatment, not merely the latest treatment. It is not calculable while active, missing-rule, or review blockers exist.

Evaluations retain farm, animal, time, methodology version, trigger, result, explanation, input hash, treatments, rules, snapshots, sources, and blockers. The input/result hash prevents repeat requests from creating duplicate decisions. A changed treatment state, administration, rule outcome, or time-boundary status creates a new current evaluation while preserving history.

Re-evaluation runs after treatment start/completion and administration recording, and is also available through an authorized explicit endpoint. Reference-data administration is not yet exposed; a future rule-governance write must invoke the same service. State changes append timeline/audit records and idempotent evaluations prevent repeated alert spam.

No ordinary user can set eligibility directly. Certificates, QR, blockchain, laboratory workflows, and measured-residue claims are outside this milestone.
