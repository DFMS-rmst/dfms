# AMU Engine

AMU is derived exclusively from persisted `TreatmentAdministration` facts whose drug has an antimicrobial class. Prescriptions are intent and never enter AMU totals until an actual administration exists. Each administration traces through treatment, prescription item, case, animal/species, farm, veterinarian, drug/active ingredient, and class.

## Implemented methodology

- Total administrations: administration-row count.
- Antimicrobial treatments/courses: distinct treatment IDs; completed courses require `COMPLETED`.
- Treated animals: distinct administered animal IDs.
- Animals treated percentage: distinct treated animals divided by the current active farm-animal roster, times 100. This is an MVP period denominator and is displayed with that limitation.
- Antimicrobial treatment-days: distinct animal and UTC calendar-day pairs containing an administration. Long-acting coverage is not inferred.
- Mean completed-course duration: elapsed time from treatment start to completion divided by completed courses.
- Breakdowns: administration, treatment, and animal counts by drug/active ingredient, class, species, latest case diagnosis, farm, and veterinarian.
- Monthly trend: the same descriptive counts grouped by UTC administration month.
- Active-ingredient mass: sum of `activeIngredientMg` only when a validated conversion and provenance were captured. Missing conversions are never inferred.

`mg/kg`, treatment incidence per 1,000 animal-days, DDDvet, and DCDvet return `METRIC_NOT_AVAILABLE` until matched liveweight/population-time or standardized-dose mappings exist. No threshold is labelled regulatory and no result proves misuse. Methodology version: `SIH-AMU-1.0`, based on the sources documented in `docs/research/amu-methodology.md`.

Farm members are restricted to authorized farms. Veterinarians receive only farms connected to their assigned cases. Platform administrators may request organization aggregates.
