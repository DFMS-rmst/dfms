# ML evaluation

Model version: `SIH-AMU-IFOREST-1.1`. Training type: **SYNTHETIC DEMONSTRATION DATA**.

- Samples: 800 deterministic synthetic feature vectors.
- Seed: 25007.
- Features: 12 administration/treatment-derived values documented in the methodology.
- Model: standardized Isolation Forest, 200 trees, assumed contamination 0.05.
- Evaluation does not report “accuracy” because no genuine normal/misuse labels exist.

Automated evaluation verifies identical generated matrices for the fixed seed, stable repeated inference, safe missing-history behavior, and a controlled high-frequency/repeated-exposure vector scoring higher than a low-use vector and entering the HIGH presentation band. Tests also cover feature extraction from actual administration-shaped rows and approved-corpus retrieval/provenance.

Generator revision `SYNTHETIC-AMU-1.1` additionally validates all rows before they can be exported or used for training. Zero-treatment rows contain zero treatment-related counts and retain only the documented `365` no-history sentinel. Window counts, administration counts, drug/class cardinalities, treatment days, repeat counts/ratio, duration, and days-since windows are checked for internal consistency.

This controlled anomaly test demonstrates software sensitivity, not clinical validity. False positives and false negatives cannot be estimated without an independently labelled, representative dataset. Before real use, evaluate anomaly-rate stability by farm size/species/season, review flagged cases with domain experts, measure drift, and record any labelled validation with confidence intervals.
