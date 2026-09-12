# Data Quality and Limitations

## Verification states

- `VERIFIED`: transcribed and cross-checked against the cited authoritative source for the stated scope.
- `REVIEW_REQUIRED`: evidence exists but applicability/interpretation needs a veterinarian or regulatory reviewer.
- `RULE_NOT_FOUND`: no adequate rule for the requested context.
- `NOT_AVAILABLE`: the source explicitly lacks the information.
- `CONFLICTING_SOURCE`: incompatible claims for the same jurisdiction and applicability remain unresolved.
- `EXAMPLE_ONLY`: authoritative in another jurisdiction but not applicable to India by default.

## Material gaps

- Public Indian sources establish mandatory withdrawal labelling and a seven-day minimum when a specific value is unvalidated, but do not provide a centralized, easily queryable catalogue of current Indian veterinary product labels.
- Cattle product information cannot be assumed to cover buffalo. Buffalo certificate rules require explicit evidence or expert review.
- Withdrawal differs by product, concentration, route, formulation, dose regimen, lactation/dry-cow use, and jurisdiction. Ingredient-only lookup is unsafe.
- FSSAI compendia are convenient but original notifications prevail; references require periodic currency review.
- Disease lists are structured recording aids. They do not prove etiology, susceptibility, or indicate a drug/dose.
- AMU mass metrics can invert apparent trends when farms switch between agents with different potency. Always present multiple complementary metrics.
- Biomass and DDDvet/DCDvet require reliable denominators/mappings that ordinary farms may not initially capture.

## No-laboratory boundary

Some veterinary guidance discusses diagnostic sampling or antimicrobial susceptibility testing. This research cites those sources for clinical context only. The project does not create laboratory users, sample/result records, residue measurements, simulated results, or lab integrations.

## Required governance before certificate use

An authorized domain reviewer must approve source identity, effective date, exact product authorization/label, species (especially buffalo), route/formulation/dose conditions, withdrawal duration/unit/anchor, and rule status. Changes create a new version; records are not silently overwritten.

## Revalidation schedule

Check regulator amendment registers before each release/demo; review active rules at least annually and whenever a product label, authorization, regulation, or jurisdiction changes. Store retrieval and verification timestamps separately.
