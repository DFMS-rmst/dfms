# AMU Methodology

AMU is a first-class pipeline derived from actual administrations. Prescriptions alone do not count as use.

## Recommended core metrics

| Metric | Formula | Inputs | Unit | Purpose/limitations |
|---|---|---|---|---|
| Active-ingredient mass used | `sum(administered_product_amount × ingredient_concentration × conversion_factor)` | actual amount/unit, concentration numerator/denominator, ingredient share, conversion source | mg (display g/kg as appropriate) | WOAH minimum quantitative basis; mass can mislead across high/low-potency agents, so always split by ingredient/class |
| Active-ingredient mass per animal | `total active mg / mean animals at risk` | active mg, animal-at-risk roster and period | mg/animal-period | Farm trend normalization; denominator definition must be stable |
| Active-ingredient mass per kg liveweight | `total active mg / sum kg liveweight at risk` | active mg, measured/approved weights and dates | mg/kg-period | Comparable density only when reliable weights exist; do not invent standard buffalo/cattle weights |
| Animals treated proportion | `distinct animals receiving ≥1 antimicrobial / animals at risk × 100` | animal IDs, administration dates, eligible population-time | % per period | Exposure reach, not quantity or appropriateness |
| Treatment incidence | `animal antimicrobial treatment-days / animal-days at risk × 1,000` | treatment day per animal, course dates, herd presence dates | treatment-days/1,000 animal-days | Practical longitudinal exposure; overlapping same-ingredient doses need a documented deduplication rule |
| Antimicrobial treatment-days | count of distinct `(animal, calendar day)` with any antimicrobial; also stratify by ingredient/class | administration/course coverage intervals | days | Easy to explain; does not capture dose magnitude |
| Completed antimicrobial courses | count distinct completed course IDs | course ID, start/end/completion, ingredient | courses | Workflow/adherence indicator; not sufficient alone |
| Mean course duration | `sum course duration days / completed courses` | course start/last dose/end, completeness | days/course | Detects duration patterns; depends on correct course grouping |
| Distribution by ingredient/class/route/condition | `metric value in category / total metric value × 100` | canonical mappings and chosen numerator | % plus absolute value | Stewardship pattern view; show denominator/numerator metric explicitly |
| Monthly trend | chosen metric aggregated by month using farm time zone | administration times, metric inputs, time zone | metric/month | Trend monitoring; affected by herd size, disease pressure, seasonality and missing records |

## Advanced standardized metrics

EMA defines DDDvet as an assumed average dose per kg animal per species per day and DCDvet as an assumed average course dose. Potential indicators include number of DDDvet or DCDvet per biomass and intramammary units per dairy cow. These are recommended only after the architecture stores:

- the exact EMA mapping by ingredient, species, route/form, and long-acting exception;
- animal biomass or dairy-cow denominator for the same surveillance period;
- active mass or intramammary units; and
- methodology version.

DDDvet/DCDvet are technical surveillance units, not prescription recommendations, and European values must be labelled as an adopted comparison method rather than Indian government thresholds.

## Required data quality

Actual product and amount, active concentration with units, canonical ingredient/class, animal/group count, administration time, route/form, indication/type of use, course ID and duration, species/production class, farm, reliable population-at-risk dates, and weight data if biomass metrics are enabled.

## Dashboard minimum

Show active-mass trend and shares, treated-animal proportion, treatment incidence, treatment-days, course count/duration, and breakdowns by ingredient, class, route, condition, species, farm, and month. Never label high use as misuse. Optional analytics may only state “Unusual antimicrobial usage pattern — veterinary review recommended.”

Sources: WOAH chapters 6.9 and 6.10; FAO/WOAH farm-level AMU guideline; EMA DDDvet/DCDvet and denominator guidance. Metric definitions and versions are machine-readable in `amu_metrics.json`.

