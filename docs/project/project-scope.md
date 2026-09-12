# Project Scope

## In scope

### Identity, farms, and livestock

- Secure account authentication and role-based, farm-scoped authorization
- Self-service farm creation with configurable organizational approval
- Farm membership and multi-role assignments
- Animal profiles, identification, images, and health history

### Veterinary services

- Separate veterinarian registration and platform verification workflow
- Private credential documents and profile/animal/request images in AWS S3
- Discovery limited to `VERIFIED` veterinarians using service-area and professional filters
- Treatment requests, acceptance/rejection, veterinary cases, and persisted case chat
- Veterinarian-entered diagnosis and structured prescriptions
- Actual treatment administration and treatment completion records

### Reference data and compliance decisions

- Curated veterinary/reference data with source provenance, jurisdiction, version, and verification state
- Educational MRL reference information, kept separate from withdrawal rules and never treated as a measurement
- Explainable withdrawal-rule selection and calculation
- Whole-history milk-eligibility evaluation across all blocking treatments
- Explicit safe states including `RULE_NOT_FOUND`, `CONFLICTING_SOURCE`, and `REVIEW_REQUIRED`
- Certificate issuance only for `ELIGIBLE_FOR_MILK`, plus revocation/supersession and history retention

### AMU, monitoring, and evidence

- First-class AMU processing from actual treatment-administration records
- Usage analysis by drug, active ingredient, antimicrobial class, species, disease, farm, treatment duration, and time
- Scientifically supported quantity/dose/biomass metrics only when the required data and validated methodology exist
- Operational alerts, role-specific dashboards, reports, and audit logs
- QR certificate verification with privacy-limited public output
- Deterministic certificate serialization, SHA-256 hashing, and limited blockchain anchoring

## Explicitly out of scope

- Any laboratory module, laboratory user, sample workflow, residue test, device integration, measured/simulated residue value, or lab report
- Claims that the system certifies residue absence, MRL compliance through measurement, or government/legal veterinarian status
- AI diagnosis or automatic conversion of messages into diagnosis, prescriptions, treatment, or regulatory decisions
- Invented dosage advice, withdrawal periods, regulatory thresholds, or veterinary/reference data
- Live GPS tracking for the MVP
- Blockchain as a database; full records, private data, all tables, and all audit events on-chain
- Tokens, cryptocurrency, NFTs, or payments
- Regulator role in the initial MVP; future read-only access may be considered separately
- Advanced ML/anomaly detection until the core platform is complete; if later added, it signals patterns for veterinary review and does not prove misuse

## MVP quality boundary

The MVP reference dataset will be deliberately small, authoritative, fully cited, and sufficient for the primary demonstration. Missing or conflicting critical rules block certification rather than being guessed. Every module must integrate with the central treatment-to-eligibility story; unrelated feature expansion is excluded.

## Later-phase decisions

- Exact supported livestock species and products after authoritative research
- Farm approval policy and certificate expiry policy as operator configuration
- Persisted polling versus WebSocket case chat
- Choice of Hardhat or Anvil and deployment network
- Scientifically defensible AMU metric set after methodology research and data-feasibility review
