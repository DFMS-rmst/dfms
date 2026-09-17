# MVP Species

## Selected

1. **Dairy cattle — `BOS_TAURUS`**
2. **Domestic water buffalo — `BUBALUS_BUBALIS`**

DAHD reports that cattle categories contributed 53.53% and buffalo categories 43.15% of Indian milk in 2024-25. These two bovine species therefore cover 96.68% of reported production and give the strongest practical MVP scope.

## Species modelling rules

- Keep cattle and buffalo as distinct species IDs; never silently map a cattle rule to buffalo.
- Store production class (`DAIRY`, `LACTATING`, `DRY`, `CALF`) separately because product eligibility and withdrawal instructions can depend on it.
- A rule whose source says `cattle` has `BOS_TAURUS` scope only unless an authoritative source explicitly includes buffalo/bovines.
- Buffalo rules are expected to be the largest Indian evidence gap. Until reviewed product information explicitly covers buffalo, return `RULE_NOT_FOUND` or `REVIEW_REQUIRED`.
- Architecture may add goats, sheep, pigs, poultry, and fish later without changing canonical IDs.

See `data/reference/species.json` for the machine-readable structure.
