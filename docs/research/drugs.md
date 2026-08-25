# Antimicrobial Drug Reference Subset

## Selection

Eight active ingredients provide multiple classes, routes, dairy conditions, MRL examples, and product-specific withdrawal examples without pretending to cover all veterinary medicine.

| Canonical active ingredient | Class | Typical relevant forms/routes | Dataset status |
|---|---|---|---|
| Amoxicillin | Aminopenicillin (beta-lactam) | Injectable; intramammary combinations | Selected; exact product identity mandatory |
| Ampicillin | Aminopenicillin (beta-lactam) | Injectable | Selected; Indian MRL reference available |
| Benzylpenicillin (penicillin G) | Natural penicillin (beta-lactam) | Injectable; intramammary combinations | Selected; salt/procaine identity must be retained |
| Oxytetracycline | Tetracycline | Injectable, including long-acting formulations | Selected; formulation/dose can change withdrawal |
| Ceftiofur | Third-generation cephalosporin | Injectable | Selected for route/class and official foreign zero-hour example; high-priority stewardship context |
| Cefapirin | First-generation cephalosporin | Intramammary lactating/dry-cow products | Selected for mastitis/formulation modelling |
| Enrofloxacin | Fluoroquinolone | Injectable/oral depending product | Selected because DAHD guidance mentions it; prudent-use restrictions apply |
| Sulfadimidine (sulfamethazine) | Sulfonamide | Oral/injectable depending product | Selected with Indian cattle-milk MRL reference |

## Naming and relationship rules

- A `drug product` is not the same as an `active ingredient`.
- Preserve ingredient salt/hydrate, concentration, combination partners, pharmaceutical form, route, target species/production class, marketing authorization/jurisdiction, and label version.
- Use aliases only for search. For example, sulfadimidine and sulfamethazine may be related synonyms in some nomenclatures, but source records retain the source term.
- Disease relationships are `CONTEXT_ONLY`; they must never become automatic dose/prescribing recommendations.
- Product-specific withdrawal rules may not be generalized to another brand, concentration, formulation, route, dose regimen, species, or jurisdiction.

## Required prescription fields

Case, animal/species/production class, diagnosis/indication, veterinarian, product and active ingredient(s), concentration and units, intended dose and dose basis, route, frequency/interval, duration, start/expected end, instructions, indication type (treatment/control/prevention), off-label flag and rationale, withdrawal instruction copied from reviewed label/source, prescriber timestamp, and reference/label version.

## Required administration fields

Prescription (if any), animal/group and count, actual product/batch, ingredient concentration snapshot, amount administered and unit, calculated active-ingredient mass and conversion provenance, route/site, date/time, administrator, animal weight and measurement date when used, indication, treatment-course ID, missed/changed dose notes, last-dose marker, and completion timestamp. These fields support WOAH-recommended product/API, batch, prescriber/supplier, date, animal count/identity, disease, regimen, and withdrawal end-date records.

