# Withdrawal Engine

The engine evaluates actual administrations associated with non-cancelled treatments for product `MILK`. Active/planned treatment blocks immediately. Completed treatments without administrations create no antimicrobial withdrawal exposure.

## Rule resolution

Rules are imported from `data/reference/` with source, jurisdiction, product, species, route, formulation, duration, verification state, and certificate-use context. An automatically usable rule requires exact drug, product, species, route, jurisdiction, and `VERIFIED` status. Multiple exact matches, review states, or conflicting applicability produce `REVIEW_REQUIRED`. No match produces `RULE_NOT_FOUND` unless the Indian statutory minimum is present, in which case the result remains `REVIEW_REQUIRED` because research explicitly requires exact-label/domain review.

Foreign `EXAMPLE_ONLY` rules never become Indian fallbacks. Cattle rules are never inherited by buffalo. Values are not hard-coded in application logic.

Withdrawal starts at the later of treatment completion and the last matching administration, unless a future sourced rule defines another anchor. Hours and days are added as exact UTC durations. Eligibility begins at `evaluationTime >= withdrawalEnd`. The rule snapshot and source remain attached to each evaluation.

MRLs do not enter this calculation. No residue is measured or predicted.
