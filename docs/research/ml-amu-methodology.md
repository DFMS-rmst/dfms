# ML-based AMU anomaly methodology

## Research conclusion

The model answers one narrow question: **does this recorded AMU feature vector look unusual relative to the training distribution?** It does not detect disease, prove misuse, establish a regulatory breach, or affect withdrawal, eligibility, or certificates.

Isolation Forest was selected because labels such as `NORMAL` and `MISUSE` are unavailable and ethically inappropriate to invent. The original peer-reviewed method isolates sparse/different observations with randomized trees, supports subsampling, and does not require labelled anomalies ([Liu, Ting, and Zhou, IEEE ICDM 2008](https://doi.org/10.1109/ICDM.2008.17)). Scikit-learn documents that shorter isolation paths yield more abnormal scores and that its decision function is lower for more abnormal observations ([IsolationForest documentation](https://scikit-learn.org/stable/modules/generated/sklearn.ensemble.IsolationForest.html)).

WOAH recommends monitoring antimicrobial patterns by species, agent/class, type of use, and route, and using trends to support stewardship—not to automatically establish misuse ([WOAH Terrestrial Code monitoring guidance](https://www.woah.org/fileadmin/Home/eng/Health_standards/tahc/2016/en_chapitre_antibio_monitoring.htm)). WOAH also uses biomass only when the required population data are available. This project therefore excludes biomass-derived features rather than fabricating a denominator.

## Feature contract

All features are derived from actual `TreatmentAdministration` rows and their existing treatment/case/drug relations over UTC 30/90-day windows:

- treatments and administrations in 30/90 days;
- distinct drugs and antimicrobial classes in 90 days;
- distinct administration days;
- mean duration of completed courses with real start/end timestamps;
- repeated same-drug and same-class exposure counts;
- repeated recorded-diagnosis episode ratio where diagnoses exist;
- days since the latest recorded treatment.

Missing histories become zero counts; missing durations/diagnoses are not invented. “365 days” is a documented sentinel for no prior recorded treatment, not a clinical fact. Farm analysis averages the same animal vectors for active animals, avoiding a second contradictory AMU formula; the UI additionally retains the existing farm AMU summary.

## Model and thresholds

The reproducible demo model uses 200 estimators, contamination 0.05, and random seed 25007. Inputs are standardized using training-only statistics. The raw decision function is preserved. A bounded display score is `clip(50 - raw_score × 250, 0, 100)`.

Synthetic generator revision `SYNTHETIC-AMU-1.1` enforces consistent nested 30/90-day counts, requires administrations and drug/class counts to be supported by treatment episodes, constrains distinct administration days to administration counts, and uses `365` only for no recorded treatment. Each generated matrix is validated before training or export. This remains demonstration data and is not a model of real Indian farm prevalence.

- LOW: display score below 40
- MEDIUM: 40 through 69.99
- HIGH: 70 or above

These are system-defined presentation bands, not probabilities, clinical categories, or regulatory thresholds. Contributing indicators are deterministic comparisons with training means/standard deviations and are the only reasons the advisor may use when explaining a result.

## Limitations

Isolation Forest is sensitive to training distribution, feature scaling, contamination choice, sample size, and recording behavior. A rare but appropriate clinical course can be anomalous, while common poor practice may not be. Farm averages can hide within-farm variation. The system must use “veterinary review recommended,” never “misuse confirmed.” Retraining on application data requires governance, sufficient observations, drift review, and versioned evaluation before activation.
