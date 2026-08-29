# ML intelligence architecture

```text
React risk card → Express RBAC → transactional feature extractor
                               → private FastAPI inference service
                               → versioned Isolation Forest artifact
```

Express is the only user-facing API. It verifies administrator, active farm membership, or assigned-veterinarian scope before querying MySQL or calling FastAPI. Features reuse actual administration relations and existing AMU definitions. The ML service receives a minimal numeric vector—no passwords, contact data, chats, S3 keys, or medical document binaries.

Endpoints are `GET /api/v1/ml/animals/:animalId/amu-risk` and `GET /api/v1/ml/farms/:farmId/amu-risk`. Responses include raw anomaly score, bounded display score, LOW/MEDIUM/HIGH presentation band, version, timestamp, deterministic indicators, feature values, and the decision-support disclaimer.

The model is trained reproducibly by `ml/training/train.py`. The artifact and metadata record version, algorithm, feature order, seed, contamination, sample count, training-data type, timestamp, and distribution summary. The Docker image trains the small model during build. A failed ML service yields `ML_SERVICE_UNAVAILABLE`; it never changes core transactional state.

The withdrawal/eligibility engine and certificate service have no dependency on ML routes. No ML result can change a treatment, withdrawal rule, eligibility check, certificate, or blockchain proof.
