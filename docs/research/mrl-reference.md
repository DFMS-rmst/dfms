# MRL Reference Information

MRLs/tolerance limits are **reference values only**. This project does not collect samples or measurements, compare a measured residue with an MRL, or derive withdrawal time from an MRL.

## Indian MVP references

Five milk entries are transcribed from the FSSAI Contaminants, Toxins and Residues Compendium, Version VIII (1 April 2025), sub-regulation 2.3.2 table:

| Active ingredient | Species/food scope | Value | Unit |
|---|---|---:|---|
| Ampicillin | all edible animal tissues/fats/milk (species not narrowed) | 0.01 | mg/kg |
| Amoxicillin | cattle milk | 0.004 | mg/kg |
| Ceftiofur | cattle milk | 0.1 | mg/kg |
| Cefapirin/“Cephapirine” source spelling | all edible animal tissues/fats/milk | 0.01 | mg/kg |
| Sulfadimidine | cattle milk | 0.025 | mg/kg |

Source wording is preserved in `mrl_reference.json`; canonical mapping is separate. The 2026 FSSAI amendment is effective 1 December 2026 and was checked for currency; its veterinary-drug changes concern seafood entries rather than these selected milk records. Recheck the consolidated regulation before implementation or demo release.

## International comparison

Codex/JECFA values may differ in marker residue definition, species, food, and unit. Do not silently merge them with Indian values. Each jurisdiction gets a distinct record and version. A difference is not automatically an error; it becomes `CONFLICTING_SOURCE` only when two allegedly current sources claim the same jurisdiction and applicability with incompatible values.

## Display safeguards

Every screen/report must state: “Regulatory reference only; no residue was measured.” MRL data must never control certificate issuance in this no-laboratory project.
