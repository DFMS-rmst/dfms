# Authoritative Domain Research Summary

Retrieval date: **2026-08-25**

## Outcome

The MVP should cover **dairy cattle (`BOS_TAURUS`) and domestic water buffalo (`BUBALUS_BUBALIS`)**. Together, cattle and buffalo supplied 96.68% of India's reported milk in 2024-25; buffalo alone supplied 43.15% and cattle 53.53% ([DAHD BAHS 2025](https://www.dahd.gov.in/sites/default/files/2025-11/BAHS2025Brochure.pdf)).

The reference subset contains eight antimicrobial active ingredients, six dairy-relevant condition groups, five Indian milk MRL reference records, four foreign product-specific withdrawal examples, and one Indian statutory minimum rule. It is sufficient to design the architecture and demonstrate rule selection in a clearly labelled academic scenario. It is **not sufficient to seed an India-production certificate engine without reviewed Indian product labels**.

## Main findings

- India requires the container of a medicine for food-producing animals to state a species-specific withdrawal period. If a specific period has not been validated, the period must be **not less than seven days for milk or eggs** (Drugs and Cosmetics Rules 1945, Rule 97(3A), inserted by G.S.R. 28(E), 17 January 2012; [official Gazette copy](https://www.eicindia.gov.in/WebApp1/resources/PDF/GSR-28-withdrawal-period.pdf)).
- The seven-day provision is a regulatory minimum, not evidence that every product has an exact seven-day period. The engine must prefer the exact reviewed label for the actual product, species, route, formulation, and use conditions.
- Product-specific withdrawal periods differ for the same active ingredient. Official EU records show cattle-milk periods of 48 hours and 72 hours for different 150 mg/ml amoxicillin injection products. This proves that ingredient-only rules are unsafe.
- FSSAI MRL/tolerance values are food reference limits and must not be converted into withdrawal periods. The application records no measured residues.
- DAHD treatment guidance supports mastitis and other bovine infectious-condition coverage but does not authorize the application to recommend or invent treatments. Disease-drug links in the dataset are contextual, not prescribing rules.
- WOAH recommends collecting at least active-ingredient mass and animal-population/weight context, with species, class, route, type of use, regimen, and duration. FAO/WOAH also support farm-level monitoring. AMU must therefore go beyond event counts.

## Selected MVP scope

| Area               | Selection                                                                                                                                                                      |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Species            | Dairy cattle and dairy buffalo                                                                                                                                                 |
| Conditions         | Clinical mastitis; metritis/endometritis; bovine respiratory bacterial disease; foot rot; haemorrhagic septicaemia; calf bacterial enteritis/septicaemia                       |
| Active ingredients | Amoxicillin, ampicillin, benzylpenicillin, oxytetracycline, ceftiofur, cefapirin, enrofloxacin, sulfadimidine                                                                  |
| Classes            | Penicillins, tetracyclines, third-generation cephalosporins, first-generation cephalosporins, fluoroquinolones, sulfonamides                                                   |
| Core AMU           | active-ingredient mass, mg/animal, mg/kg liveweight (only with weights), treatment incidence, antimicrobial treatment-days, course counts, class/route/disease/time breakdowns |
| Advanced AMU       | DDDvet/DCDvet indicators only after exact denominator and standardized-dose mappings are available                                                                             |

## Safety classification

- **Safe for architecture and academic reference display:** normalized names/classes, species scope, provenance structures, Indian MRL references, restricted-substance flags, record-field requirements, and AMU formulas/limitations.
- **Safe for a jurisdiction-explicit academic workflow:** exact foreign-authority product rules when the demo declares that product and jurisdiction and does not present them as Indian rules.
- **Requires manual/domain-expert review:** every Indian commercial-product withdrawal label; buffalo applicability where a source says only cattle; off-label use; combination products; dose/formulation changes; and any certificate-producing rule.

## Fixed exclusions

There is no laboratory workflow, residue measurement, simulated result, or residue-compliance claim. MRLs remain educational/regulatory reference data. Blockchain is outside this research phase.
