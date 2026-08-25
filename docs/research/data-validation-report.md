# Reference Data Validation Report

Validation date: **2026-08-25**

## Dataset inventory

| File | Records |
|---|---:|
| `sources.json` | 18 |
| `species.json` | 2 |
| `diseases.json` | 6 |
| `antimicrobial_classes.json` | 6 |
| `drugs.json` | 8 |
| `drug_species.json` | 16 |
| `withdrawal_rules.json` | 5 |
| `mrl_reference.json` | 5 |
| `restrictions.json` | 3 |
| `amu_metrics.json` | 10 |

## Checks performed

- JSON syntax and top-level structure
- Duplicate IDs and normalized composite keys
- Source IDs resolve to `sources.json`
- Required source URL/organization/title/retrieval date
- Units on numeric MRL, withdrawal, concentration, and AMU definitions
- Canonical drug/species/class references resolve
- Case-normalized canonical names are unique
- Same-scope withdrawal conflicts are detected by product/species/product-food/route/formulation/jurisdiction/use-condition key
- Cross-product differences are not falsely labelled conflicts

## Result

- Duplicate IDs: **0**
- Missing source references: **0**
- Missing units on numeric regulatory records: **0**
- Inconsistent canonical drug names: **0**
- Inconsistent canonical species names: **0**
- Same-scope conflicting withdrawal rules: **0**
- Expected cross-product withdrawal differences: **1 group** (amoxicillin 150 mg/ml products, 48 versus 72 hours); correctly separated by product authorization
- Records deliberately requiring review: **1 Indian statutory-minimum withdrawal rule**
- Foreign jurisdiction example rules blocked from India matching: **4**

## Interpretation

The dataset is structurally sound for architecture and academic prototyping. It is not a production-ready India withdrawal catalogue. A reviewed Indian product label must be added before an India-scoped certificate is generated for that product/use.
