# Module Breakdown

The proposed architecture is modular and domain-oriented. Module boundaries are planning assumptions, not a finalized schema or code structure.

| Module | Core responsibility | Key integrations |
|---|---|---|
| Identity and access | Authentication, users, global roles, farm-scoped multi-role RBAC, ownership and assignment checks | Every protected module, audit |
| Farm and membership | Self-service farm lifecycle, profile, invitations, membership and configurable approval | Livestock, files, dashboards, audit |
| Livestock and health history | Animals, identifiers, species/breed references, images, observations and longitudinal health view | Veterinary workflow, treatment, compliance, AMU |
| Veterinarian onboarding and verification | Separate registration, credentials, service areas, review decisions and verification status | S3, discovery, auth, audit |
| Private file storage | Object metadata, authorization, validation, unpredictable keys and S3 presigned transfer | Vet documents, animal/request/chat attachments |
| Veterinarian discovery | Verified-only search by professional and configured location/service-area criteria | Vet profiles, treatment requests |
| Treatment requests | Farmer observations, urgency, attachments, requested veterinarian and request state machine | Livestock, discovery, cases, alerts |
| Veterinary cases and chat | Case lifecycle and authorized persisted farmer-veterinarian communication | Requests, clinical records, S3, alerts |
| Diagnosis and prescription | Explicit veterinarian diagnosis and structured prescriptions separated from reference data | Cases, drug/disease references, audit |
| Treatment administration | Actual administrations and completion, distinct from prescription intent | AMU, withdrawal, eligibility, audit |
| Reference-data governance | Cited/versioned species, disease, drug, ingredient/class, withdrawal and educational MRL references; conflicts/review | Clinical records, AMU, compliance |
| **AMU monitoring and analytics** | **Core processing and analysis from actual administrations; validated metrics, trends, breakdowns and reports** | **Treatment, references, farms, dashboards, alerts, reports** |
| Withdrawal engine | Applicable rule selection, time calculation, evidence and safe failure states | Treatment, reference data, eligibility |
| Milk-eligibility engine | Whole relevant-treatment evaluation and explainable current/historical status | Withdrawal, certificates, alerts, dashboards |
| Certificates and lifecycle | Eligibility-gated issuance, disclaimer, revocation/supersession and retained history | Eligibility, QR, blockchain, audit |
| QR/public verification | Privacy-minimized current certificate and integrity result | Certificates, blockchain verification |
| Blockchain proof | Canonicalization, SHA-256 anchoring and comparison for selected records | Certificates, PostgreSQL anchor metadata |
| Alerts | Role/farm-targeted operational events and delivery/read state | Requests, cases, treatment, compliance, AMU, blockchain |
| Dashboards and reporting | Actual-data role views and export/report services | All operational modules, authorization |
| Audit | Protected append-oriented record of material actions and state changes | All modules; PostgreSQL only |

## Cross-cutting rules

- PostgreSQL is authoritative; S3 contains private binary objects; blockchain contains only minimal integrity anchors.
- Domain services own withdrawal, eligibility, AMU, certificate, and authorization decisions—not UI components or controllers.
- Reference data and user-entered clinical facts remain distinguishable.
- Missing/conflicting critical withdrawal rules block eligibility and certificates.
- No laboratory module or residue measurement exists anywhere in the module map.
- Advanced ML/anomaly detection is a later optional enhancement; baseline AMU monitoring and analytics is mandatory.

## Planned logical layers

1. React/Vite user interface and public verification view.
2. Node.js/Express API with validation and authorization boundaries.
3. Reusable domain/application services and state machines.
4. Persistence adapters for PostgreSQL/ORM and private S3 metadata.
5. External adapters for S3 and a limited Ethereum-compatible proof network.
6. Background/reliable jobs where required for re-evaluation, alerts, reports, or anchoring retries.

The exact repository layout, database entities, API contracts, job mechanism, and technology choices will be decided and documented during the architecture phase.

