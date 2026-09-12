# Functional Requirements

Requirements use `FR-<domain>-<number>` identifiers for later traceability.

## Identity and authorization

- **FR-AUTH-01:** Register and authenticate users securely.
- **FR-AUTH-02:** Support global platform roles and farm-specific, multi-role assignments.
- **FR-AUTH-03:** Enforce RBAC, farm scope, resource ownership, veterinarian status/assignment, and record-state checks on every protected backend operation.
- **FR-AUTH-04:** Allow owners to invite/remove authorized farm members and assign permitted farm roles.

## Farms and livestock

- **FR-FARM-01:** Allow an owner to self-create and maintain a farm; optional operator approval must be configurable.
- **FR-FARM-02:** Track farm status as appropriate, including `PENDING`, `ACTIVE`, `SUSPENDED`, and `REJECTED`.
- **FR-LIVE-01:** Create and maintain animals, identifiers, species/breed references, images, and health history within a farm.
- **FR-LIVE-02:** Restrict animal access and operations to authorized farm users and relevant assigned veterinarians.

## Veterinarian onboarding and discovery

- **FR-VET-01:** Capture veterinarian identity/contact, qualification, specialization, experience, registration number/council, service area, credential document, and optional profile image.
- **FR-VET-02:** Support `PENDING`, `VERIFIED`, `REJECTED`, and `SUSPENDED` verification states and an auditable administrator decision.
- **FR-VET-03:** Permit only `VERIFIED` veterinarians to appear in normal discovery, accept requests, diagnose, and prescribe.
- **FR-VET-04:** Search verified veterinarians by configured state, district, taluka/pincode/service area, specialization, availability, and experience without requiring live GPS.

## Private object storage

- **FR-FILE-01:** Store private images/documents in a private S3 bucket and only object metadata/identifiers in MySQL.
- **FR-FILE-02:** Authorize each file operation before issuing a short-lived presigned upload or GET URL.
- **FR-FILE-03:** Validate MIME type, extension, size, ownership, and entity relationship; generate unpredictable object keys.
- **FR-FILE-04:** Never expose AWS credentials or permanent public private-object URLs to the frontend.

## Treatment requests, cases, and chat

- **FR-REQ-01:** Allow an authorized farm user to select an animal, record observations/urgency, add optional private attachments, and request a verified veterinarian.
- **FR-REQ-02:** Manage request states such as `OPEN`, `REQUESTED`, `ACCEPTED`, `REJECTED`, `CANCELLED`, `IN_PROGRESS`, and `COMPLETED` with valid transitions.
- **FR-REQ-03:** Allow only the requested/assigned verified veterinarian to accept or reject the request.
- **FR-CASE-01:** Create or activate a veterinary case on acceptance and maintain a lifecycle distinct from treatment lifecycle.
- **FR-CHAT-01:** Persist case-scoped messages, sender, timestamp, read state, and limited private attachments for authorized farm users and the assigned veterinarian.
- **FR-CHAT-02:** Never transform chat automatically into diagnosis, prescription, treatment, or regulatory decisions.

## Clinical records and treatment

- **FR-DIAG-01:** Allow only the assigned, verified veterinarian to explicitly record structured diagnoses, clinical notes, date, disease reference, and follow-up needs.
- **FR-RX-01:** Allow only an authorized verified veterinarian to create structured prescriptions linked to case, animal, veterinarian, drug/reference, dose/unit, route, frequency, duration, instructions, and expected dates.
- **FR-RX-02:** Keep veterinarian-entered clinical judgment distinct from reference data and never invent dosage advice.
- **FR-TREAT-01:** Record what was actually administered separately from what was prescribed, including drug, amount/unit, route, date/time, administrator, and notes.
- **FR-TREAT-02:** Record treatment start/completion and retain complete history for AMU, withdrawal, eligibility, and audit processing.

## Veterinary and regulatory reference data

- **FR-REF-01:** Manage a curated, versioned MVP dataset for relevant species, diseases, drugs, active ingredients/classes, drug-species relationships, withdrawal rules, and optional educational MRL references.
- **FR-REF-02:** Retain source organization/title/URL, jurisdiction, dates, page/table/section, retrieval date, and verification state where available.
- **FR-REF-03:** Preserve conflicting sources and expose `NOT_AVAILABLE`, `RULE_NOT_FOUND`, `CONFLICTING_SOURCE`, or `REVIEW_REQUIRED`; never silently overwrite or guess.
- **FR-REF-04:** Keep MRL reference information distinct from withdrawal periods and never represent MRL as a measured value.

## AMU monitoring and analytics

- **FR-AMU-01:** Treat AMU as a core domain pipeline calculated from actual treatment-administration records, not prescriptions or frontend-only aggregates.
- **FR-AMU-02:** Provide usage metrics by drug, active ingredient, antimicrobial class, species, disease, farm, treated animals, treatment duration, and time period as supported by validated data.
- **FR-AMU-03:** Provide farm, veterinarian-relevant, and platform views with trends, class distribution, frequently used antimicrobials, disease/species analysis, and monthly comparisons.
- **FR-AMU-04:** Introduce quantity-, dose-, or biomass-based metrics only after the required inputs and scientifically supported formulas are documented and validated.
- **FR-AMU-05:** Do not invent regulatory thresholds. Any later analytical threshold must be labelled non-regulatory.
- **FR-AMU-06:** Advanced anomaly detection is optional and, if implemented later, may only report an unusual pattern requiring veterinary review—not proven misuse.

## Withdrawal and milk eligibility

- **FR-WITH-01:** Select applicable withdrawal rules from the reference layer using relevant drug/ingredient, species, product, route, formulation, dosage/duration where applicable, jurisdiction, and source dimensions.
- **FR-WITH-02:** Calculate and retain rule, source, treatment end, withdrawal duration/end, evaluation time, status, and explanation.
- **FR-WITH-03:** Support `TREATMENT_ACTIVE`, `UNDER_WITHDRAWAL`, `ELIGIBLE_FOR_MILK`, `RULE_NOT_FOUND`, and `REVIEW_REQUIRED` outcomes.
- **FR-ELIG-01:** Evaluate all relevant active/recent treatments; eligibility must not rely only on the latest treatment.
- **FR-ELIG-02:** Block eligibility while any treatment is active, withdrawal is active, a required rule is missing/conflicting, or another configured blocking condition applies.
- **FR-ELIG-03:** Re-evaluate when treatments or material reference rules change and retain explainable decision history.

## Certificates, QR, and blockchain proof

- **FR-CERT-01:** Issue a unique certificate only for `ELIGIBLE_FOR_MILK`; block all other decision states.
- **FR-CERT-02:** Include rule-based evidence and a clear disclaimer that the certificate is based on recorded history/configured withdrawal rules and is not laboratory residue testing.
- **FR-CERT-03:** Retain certificate history and support `ACTIVE`, `REVOKED`, and `SUPERSEDED`; use `EXPIRED` only if a later business rule requires it.
- **FR-CERT-04:** Re-evaluate and revoke/supersede a certificate when a new treatment or other blocking change occurs; never delete historical certificates.
- **FR-QR-01:** Generate a QR verification identifier/route and return only privacy-approved public information.
- **FR-CHAIN-01:** Canonically serialize selected certificate data, compute SHA-256, anchor the hash and minimal identifiers/timestamp, and retain the transaction reference in MySQL.
- **FR-CHAIN-02:** Recompute and compare the hash and return `VERIFIED`, `TAMPERED`, `NOT_ANCHORED`, or `VERIFICATION_ERROR`.
- **FR-CHAIN-03:** Keep MySQL authoritative; do not place full/private records or every table/audit event on-chain.

## Alerts, dashboards, reports, and audit

- **FR-ALERT-01:** Generate role/farm-scoped alerts for request/case events, messages, treatment/withdrawal/eligibility changes, missing rules, certificates, blockchain failures, and later optional AMU patterns.
- **FR-DASH-01:** Provide owner/manager, veterinarian, and administrator dashboards using actual backend data, including first-class AMU views.
- **FR-REPORT-01:** Produce authorized animal health, treatment, prescription, AMU, withdrawal, eligibility, certificate, farm, audit, and blockchain verification reports from persisted data.
- **FR-AUDIT-01:** Append auditable events for material identity, farm, veterinary, treatment, compliance, reference, certificate, and blockchain actions.
- **FR-AUDIT-02:** Prevent normal users from altering audit history and retain actor, action, subject, time, and relevant context.

## Fixed prohibition

- **FR-NOLAB-01:** The system shall contain no laboratory management, users, sampling, APIs, devices, residue measurements/predictions, simulated results, uploads, or reports, and shall never claim that residues were measured.
