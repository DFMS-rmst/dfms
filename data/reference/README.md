# Machine-Readable Reference Data

These UTF-8 JSON files are research artifacts, not database seeds or application configuration.

## Conventions

- IDs are stable uppercase kebab-case identifiers.
- Canonical names are English scientific/regulatory names; aliases support search only.
- Every domain/regulatory record has `source_ids` resolving to `sources.json`.
- Dates use ISO 8601. Retrieval date is `2026-08-25`.
- Numeric values always have explicit units.
- Withdrawal rules include jurisdiction and exact product/use context. `EXAMPLE_ONLY` rules cannot be used outside their jurisdiction.
- MRL records are reference-only and must never be used to derive withdrawal or claim measured compliance.
- JSON is chosen over CSV because nested provenance, applicability constraints, formulas, and limitations are material parts of each record.

## Files

`sources`, `species`, `diseases`, `antimicrobial_classes`, `drugs`, `drug_species`, `withdrawal_rules`, `mrl_reference`, `restrictions`, and `amu_metrics`.
