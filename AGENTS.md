# AGENTS.md

# SIH25007 — Livestock AMU, Veterinary Care, Milk Eligibility

# & Blockchain Traceability Platform

---

# 1. PROJECT OVERVIEW

This repository contains a B.Tech final-year mega project based on
SIH25007.

The project is a digital livestock and dairy management platform focused on:

- farm management
- livestock management
- animal health records
- verified veterinarian discovery
- veterinary treatment requests
- farmer-veterinarian communication
- diagnosis and prescriptions
- treatment administration
- antimicrobial usage (AMU) monitoring
- withdrawal-period management
- rule-based milk eligibility
- milk eligibility certificates
- QR verification
- limited blockchain-backed record integrity
- alerts
- analytics
- reporting
- auditability

This must be developed as a serious academic prototype with multiple
integrated modules.

It must NOT become merely:

- a CRUD application
- a withdrawal calculator
- a veterinarian marketplace
- a blockchain demonstration
- an AI diagnosis application

The core domain flow is:

Farm
→ Animal
→ Health Problem
→ Veterinarian
→ Veterinary Case
→ Diagnosis
→ Prescription
→ Treatment
→ AMU
→ Withdrawal
→ Milk Eligibility
→ Certificate
→ QR Verification
→ Blockchain Proof

---

# 2. BUSINESS MODEL AND PLATFORM OWNERSHIP

The intended platform operator/customer is an organization such as:

- dairy cooperative
- private dairy
- milk collection organization
- dairy union
- organized livestock service provider

Individual farmers are users of the platform, but are not assumed to be
the primary purchaser/operator of the complete platform.

The platform administrator represents the organization operating the
platform.

Do NOT model PLATFORM_ADMIN as a government official by default.

Possible future regulator access may be implemented as read-only access,
but is outside the initial MVP unless explicitly requested.

---

# 3. USER ROLES

Primary roles:

- PLATFORM_ADMIN
- FARM_OWNER
- FARM_MANAGER
- FARM_WORKER
- VETERINARIAN

A user may hold multiple farm-level roles.

Example:

A small farmer may simultaneously be:

FARM_OWNER + FARM_MANAGER

Do not assume that FARM_OWNER and FARM_MANAGER are always different people.

Role assignments should support farm-specific authorization.

---

# 4. PLATFORM ADMIN

PLATFORM_ADMIN represents the dairy/cooperative/platform operator.

Responsibilities may include:

- veterinarian verification
- user administration
- reference-data administration
- monitoring farms
- monitoring certificates
- monitoring AMU
- platform analytics
- audit review
- managing regulatory/reference sources
- handling verification/review cases

The administrator should NOT normally create every farm manually.

---

# 5. FARM REGISTRATION

Farm owners should normally be able to:

1. Register an account.
2. Create their farm.
3. Complete farm details.
4. Add animals.
5. Invite managers/workers.
6. Connect with verified veterinarians.

Farm status may include:

- PENDING
- ACTIVE
- SUSPENDED
- REJECTED

If organizational approval of farms is implemented, it should be
configurable rather than making manual admin creation mandatory.

---

# 6. FARM ROLES

## FARM_OWNER

May:

- create/manage farm
- manage farm profile
- add animals
- invite/remove authorized farm users
- request veterinary assistance
- view treatments
- view withdrawal status
- view milk eligibility
- access certificates
- access farm AMU analytics
- access farm reports

## FARM_MANAGER

Optional role for larger farms.

May perform authorized operational activities on behalf of the owner.

A FARM_OWNER may also hold FARM_MANAGER.

## FARM_WORKER

Restricted operational role.

May perform specifically authorized activities such as:

- viewing assigned animals
- recording permitted observations
- recording treatment administration when authorized

A FARM_WORKER must not independently:

- diagnose disease
- prescribe veterinary medicine
- verify veterinarians
- alter regulatory reference data

---

# 7. VETERINARIAN REGISTRATION AND VERIFICATION

Veterinarians must register separately.

Required information should include where appropriate:

- full name
- email
- phone
- qualification
- specialization
- experience
- state
- district/service area
- veterinary registration number
- registration council
- registration certificate/document
- profile image if required

Veterinarian verification statuses:

- PENDING
- VERIFIED
- REJECTED
- SUSPENDED

Only VERIFIED veterinarians should:

- appear in normal farmer veterinarian discovery
- accept treatment requests
- create official diagnoses
- create prescriptions

PLATFORM_ADMIN performs verification.

Verification may involve comparing submitted credentials against available
official records and/or reviewing uploaded registration documents.

The system must NOT claim that it provides legal/government certification
of veterinarians.

It verifies submitted veterinary credentials for platform access.

---

# 8. AWS S3 DOCUMENT STORAGE

Private documents and images must NOT be stored directly in the relational
database.

AWS S3 will be used for private object storage.

Examples include:

- veterinarian registration certificate images/PDFs
- veterinarian profile images
- treatment-request attachments
- animal images
- other private supporting documents

Store only metadata/object identifiers in PostgreSQL.

Example metadata:

- object key
- bucket reference if necessary
- MIME type
- file size
- owner/entity reference
- uploaded_at

Do NOT store permanent public S3 URLs for private documents.

Use private S3 objects.

Access private objects using short-lived presigned URLs generated by the
backend after authorization.

Typical flow:

Frontend
→ Backend authorization
→ Backend generates S3 presigned URL
→ Frontend uploads/downloads directly with S3

For uploads, prefer presigned upload URLs where practical.

For downloads/views, use short-lived presigned GET URLs.

Do not expose AWS credentials to the frontend.

---

# 9. AWS CREDENTIAL SECURITY

AWS credentials are secrets.

Never:

- hard-code AWS_ACCESS_KEY_ID
- hard-code AWS_SECRET_ACCESS_KEY
- commit AWS credentials
- send AWS secret keys to the frontend
- place AWS credentials in React/Vite environment variables
- print credentials in logs
- include credentials in documentation examples
- commit production `.env` files

Environment-variable names may include:

AWS_REGION
AWS_S3_BUCKET
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY

Actual values must NOT be committed.

`.env` must be ignored by Git.

Provide `.env.example` containing placeholders only.

Example:

AWS_REGION=
AWS_S3_BUCKET=
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=

When deployed on AWS, prefer IAM roles/instance/task credentials over
long-lived access keys whenever possible.

Local development may use environment-based credentials.

Use least-privilege IAM permissions.

The S3 bucket must remain private.

---

# 10. VETERINARIAN DISCOVERY

Farm users should be able to discover VERIFIED veterinarians.

Search/filtering may include:

- state
- district
- service area
- specialization
- availability
- experience

Do not require live GPS tracking for the MVP.

Location matching may use:

- state
- district
- taluka
- pincode
- configured veterinarian service area

If true proximity search is later implemented, keep location privacy and
authorization in mind.

---

# 11. TREATMENT REQUEST MODULE

When a farmer notices that an animal may be ill:

Farmer
→ selects animal
→ creates treatment request
→ enters observations/symptoms
→ optionally uploads images
→ selects/request veterinarian
→ veterinarian receives request

Treatment request fields may include:

- request ID
- farm
- animal
- requested veterinarian
- farmer observations
- symptoms/notes
- urgency
- attachments
- created time
- status

Possible statuses:

- OPEN
- REQUESTED
- ACCEPTED
- REJECTED
- CANCELLED
- IN_PROGRESS
- COMPLETED

Only appropriate farm users should create requests.

Only the requested/assigned verified veterinarian should accept the
request.

---

# 12. VETERINARY CASE

When a veterinarian accepts a treatment request, create or activate a
VETERINARY_CASE.

The case connects:

Farm
→ Animal
→ Treatment Request
→ Veterinarian
→ Communication
→ Diagnosis
→ Prescription
→ Treatment

Case statuses may include:

- OPEN
- IN_PROGRESS
- TREATMENT_STARTED
- FOLLOW_UP
- COMPLETED
- CANCELLED

Keep case lifecycle separate from treatment lifecycle where appropriate.

---

# 13. FARMER-VETERINARIAN CHAT

Provide case-specific communication.

Chat should be linked to a VETERINARY_CASE or treatment request.

Users:

- authorized farm user
- assigned veterinarian

Messages may support:

- text
- timestamp
- sender
- read status
- limited attachments where useful

Attachments should use private S3 storage and presigned URLs.

Chat must NOT automatically create:

- diagnosis
- prescription
- treatment
- regulatory decision

The veterinarian must explicitly create structured diagnosis and
prescription records.

Do not implement AI diagnosis from chat.

Real-time WebSocket communication is optional.

A simpler persisted messaging implementation is acceptable for the MVP if
it provides a reliable case conversation.

---

# 14. DIAGNOSIS

Diagnosis is entered by the VERIFIED veterinarian.

The system must NOT automatically diagnose animals from farmer symptoms.

Diagnosis records may contain:

- animal
- veterinary case
- veterinarian
- disease/reference
- clinical notes
- diagnosis date
- follow-up requirements

Disease reference data may help standardize records.

Veterinary judgment remains with the veterinarian.

---

# 15. PRESCRIPTION MANAGEMENT

Only authorized VERIFIED veterinarians may create prescriptions.

Prescription should connect:

Veterinary Case
→ Animal
→ Veterinarian
→ Drug
→ Instructions

Store structured information where available.

Potential fields:

- drug
- active ingredient
- dose
- unit
- route
- frequency
- treatment duration
- instructions
- start date
- expected end date

Do not automatically invent dosage recommendations.

Reference data and veterinarian-entered prescription data must remain
distinguishable.

---

# 16. TREATMENT ADMINISTRATION

Treatment administration records what was actually administered.

Do not assume that prescription automatically means treatment occurred.

Track where appropriate:

- prescription
- animal
- drug
- administered amount
- unit
- route
- administration date/time
- administered by
- notes

Treatment history becomes a major input to:

- AMU
- withdrawal calculation
- milk eligibility
- audit trail

---

# 17. NO LABORATORY MODULE

This is a fixed project decision.

The project does NOT include laboratory testing.

Do NOT implement:

- laboratory management
- laboratory users
- residue testing
- residue-measurement devices
- laboratory sample collection
- laboratory APIs
- measured residue values
- simulated laboratory results
- sample reports
- lab result uploads
- residue prediction presented as measurement

The system must never claim that it measured antimicrobial residues.

---

# 18. MRL INFORMATION

Maximum Residue Limit (MRL) information may exist as regulatory/reference
information.

It is NOT a measured value in this project.

Never equate:

MRL = withdrawal period

MRL records may include:

- drug
- active ingredient
- species
- food product/tissue
- jurisdiction
- MRL value
- unit
- regulatory source
- effective date
- verification date

MRL information may be shown educationally/reference-wise in the
application.

Do not use nonexistent laboratory measurements to claim MRL compliance.

---

# 19. DOMAIN RESEARCH

Before implementing domain-dependent modules, perform research using
authoritative sources.

Prioritize:

Indian sources:

- FSSAI
- Department of Animal Husbandry & Dairying
- Ministry of Fisheries, Animal Husbandry & Dairying
- other relevant Government of India sources

International sources:

- Codex Alimentarius
- JECFA
- FAO
- WHO
- WOAH/OIE

Peer-reviewed veterinary literature may be used when appropriate.

Research:

- relevant livestock species
- relevant diseases
- veterinary antimicrobial drugs
- active ingredients
- drug classes
- drug/species relationships
- milk withdrawal rules
- MRL reference information
- restricted/prohibited substances where relevant
- AMU methodologies
- relevant jurisdictions

Do NOT invent veterinary/regulatory values.

---

# 20. RESEARCH SCOPE

Do NOT attempt to import every veterinary drug or disease in existence.

Create a defensible academic MVP reference dataset.

Prefer a smaller high-quality dataset with:

- authoritative sources
- complete provenance
- useful withdrawal information
- drugs suitable for demonstrating the main workflow

over a massive incomplete dataset.

The primary demonstration dataset should intentionally include enough
verified information for the full end-to-end milk eligibility workflow.

---

# 21. REFERENCE DATA PROVENANCE

Important reference records must retain provenance.

Store where available:

- source organization
- source document/title
- source URL
- jurisdiction
- publication/update date
- effective date
- page/table/section
- retrieval date
- verification status

Do not silently overwrite conflicting reference values.

Version important reference rules where appropriate.

---

# 22. MISSING OR CONFLICTING DOMAIN DATA

Never replace missing veterinary/regulatory information with guesses.

Use explicit states such as:

- VERIFIED
- NOT_AVAILABLE
- RULE_NOT_FOUND
- CONFLICTING_SOURCE
- REVIEW_REQUIRED

If a critical withdrawal rule cannot be reliably determined:

DO NOT issue a Milk Eligibility Certificate.

Instead:

Animal
→ RULE_NOT_FOUND / REVIEW_REQUIRED
→ certificate blocked

The administrator/domain reviewer may later add or verify an appropriate
rule with full source provenance.

The demo dataset should be selected to minimize this situation during the
main demonstration.

---

# 23. WITHDRAWAL RULES

Withdrawal periods are separate from MRLs.

Withdrawal rules may depend on:

- drug
- active ingredient
- species
- product
- route
- formulation
- dosage where applicable
- treatment duration where applicable
- jurisdiction
- source

Never hard-code drug-specific withdrawal periods in application source
code.

Retrieve applicable rules from the reference-data layer.

---

# 24. WITHDRAWAL ENGINE

Core workflow:

Treatment
→ Treatment Completion
→ Applicable Withdrawal Rule
→ Withdrawal Start
→ Withdrawal End
→ Current Status

Important statuses:

- TREATMENT_ACTIVE
- UNDER_WITHDRAWAL
- ELIGIBLE_FOR_MILK
- RULE_NOT_FOUND
- REVIEW_REQUIRED

Every calculated decision must be explainable.

Store or expose:

- animal
- treatment
- drug
- applicable rule
- rule source
- treatment end date
- withdrawal duration
- withdrawal end date
- evaluation date
- resulting status
- explanation

---

# 25. MILK ELIGIBILITY ENGINE

The central operational question is:

"Is milk from this animal currently eligible for collection based on
recorded treatment history and applicable withdrawal rules?"

Eligibility must consider all relevant active/recent treatments.

Do NOT simply inspect the latest treatment if another treatment still has
an active withdrawal period.

An animal must not be marked ELIGIBLE_FOR_MILK if:

- treatment is currently active
- any applicable milk withdrawal period remains active
- required withdrawal rule is missing
- conflicting reference data requires review
- another configured blocking condition exists

Eligibility is rule/reference based.

It is NOT laboratory residue certification.

---

# 26. MILK ELIGIBILITY CERTIFICATE

Generate a certificate only when:

status = ELIGIBLE_FOR_MILK

Possible certificate fields:

- unique certificate number
- verification ID
- animal ID/tag
- farm
- species
- relevant treatment information
- drug/active ingredient
- treatment completion date
- withdrawal rule
- withdrawal completion date
- rule/reference source
- issue date/time
- issuer/system
- certificate status
- QR code
- blockchain verification information

Possible certificate states:

- ACTIVE
- REVOKED
- SUPERSEDED
- EXPIRED only if the business rule requires expiry

Certificate generation must be blocked for:

- TREATMENT_ACTIVE
- UNDER_WITHDRAWAL
- RULE_NOT_FOUND
- REVIEW_REQUIRED

The certificate must clearly contain a disclaimer equivalent to:

"This certificate represents eligibility based on recorded treatment
history and configured withdrawal-period reference rules. It does not
represent laboratory residue testing."

---

# 27. CERTIFICATE REVOCATION / RE-EVALUATION

Eligibility is not permanently guaranteed.

If a new treatment is recorded after certificate issuance, the system must
re-evaluate eligibility.

An existing certificate may need to become:

REVOKED or SUPERSEDED

depending on the business rule.

Certificate history must remain auditable.

Do not delete previously issued certificates merely because status changes.

---

# 28. AMU — ANTIMICROBIAL USAGE

AMU means Antimicrobial Usage.

AMU should be calculated from actual treatment-administration records.

Research and document scientifically defensible metrics.

Potential metrics include:

- total antimicrobial treatments
- number of treated animals
- usage by drug
- usage by active ingredient
- usage by antimicrobial class
- usage by species
- usage by disease
- usage by farm
- monthly/time-series trends
- treatment duration

Implement dose/quantity/biomass-based metrics only when required input data
and scientifically supported formulas are available.

Do not invent government thresholds.

---

# 29. AMU ANALYTICS / OPTIONAL ANOMALY DETECTION

AMU dashboards should help identify patterns.

Potential views:

- farm usage trend
- antimicrobial class distribution
- frequently used antimicrobials
- usage by disease
- usage by species
- monthly comparisons

Optional anomaly detection may be implemented only after the main system
works.

Anomaly detection should say:

"Unusual antimicrobial usage pattern — veterinary review recommended."

It must NOT say:

"Antimicrobial misuse proven."

System-defined analytical thresholds must be clearly identified as
analytical, not regulatory.

---

# 30. ALERT SYSTEM

Generate useful operational alerts.

Examples:

- veterinarian treatment request received
- veterinarian accepted/rejected request
- new case message
- treatment active
- withdrawal active
- withdrawal ending soon
- animal became eligible for milk
- withdrawal rule missing
- eligibility requires review
- certificate issued
- certificate revoked
- blockchain anchoring failure
- unusual AMU pattern where implemented

Alerts should respect user roles and farm authorization.

---

# 31. QR VERIFICATION

Milk Eligibility Certificates should contain a QR code.

QR should resolve to a verification route such as:

/verify/certificate/:verificationId

Public verification must expose only appropriate information.

Do not expose:

- private veterinarian documents
- full medical history
- private farmer data
- private chat
- unnecessary personal information

Verification may show:

- certificate number
- animal tag/appropriate identifier
- farm name where appropriate
- issue date
- eligibility date
- certificate status
- blockchain verification status

---

# 32. BLOCKCHAIN SCOPE

Blockchain is intentionally small.

PostgreSQL remains the application source of truth.

Blockchain exists only as an immutable proof layer for selected records.

Primary blockchain use:

Milk Eligibility Certificate hash.

Optional secondary use:

Treatment completion record hash.

Do NOT blockchain-enable every table.

---

# 33. BLOCKCHAIN DESIGN

Preferred flow:

Certificate
→ deterministic canonical serialization
→ SHA-256 hash
→ blockchain transaction
→ blockchain anchor stored
→ transaction identifier stored in PostgreSQL

Suggested on-chain information:

- record/certificate ID
- record hash
- timestamp
- issuer identifier where appropriate

Do not put full certificates or private data on-chain.

Verification:

Database Certificate
→ canonical serialization
→ recompute SHA-256
→ retrieve blockchain anchor
→ compare

Return:

- VERIFIED
- TAMPERED
- NOT_ANCHORED
- VERIFICATION_ERROR

A local Ethereum-compatible network such as Hardhat or Anvil may be used
for academic development.

Do not implement:

- tokens
- cryptocurrency
- NFTs
- payments
- blockchain database replacement

---

# 34. AUDIT TRAIL

Important actions must be auditable.

Examples:

- farm created
- user invited
- veterinarian submitted verification
- veterinarian approved/rejected
- animal created
- treatment request created
- treatment request accepted/rejected
- veterinary case created
- diagnosis recorded
- prescription issued
- treatment administered
- treatment completed
- withdrawal calculated
- eligibility changed
- certificate issued
- certificate revoked
- blockchain anchor created
- reference rule changed

Audit logs remain in PostgreSQL.

Do not anchor every audit log on blockchain.

Normal users must not be able to alter audit history.

---

# 35. DASHBOARDS

## FARM OWNER / MANAGER DASHBOARD

Show relevant information such as:

- total animals
- active veterinary cases
- active treatments
- animals under withdrawal
- currently eligible animals
- treatment requests
- alerts
- certificates
- AMU summary

## VETERINARIAN DASHBOARD

Show:

- pending treatment requests
- accepted cases
- active cases
- messages
- diagnoses
- prescriptions
- treatments
- follow-ups
- withdrawal-related information
- relevant AMU analytics

## PLATFORM ADMIN DASHBOARD

Show:

- farms
- users
- pending veterinarian verification
- verified veterinarians
- treatments
- AMU trends
- withdrawal statistics
- eligibility statistics
- certificates
- reference-data health
- blockchain anchors
- audit events
- verification failures

Use actual backend data.

Do not create fake frontend-only dashboard statistics.

---

# 36. REPORTING

Support useful reports such as:

- animal health history
- veterinary treatment history
- prescription report
- AMU report
- withdrawal report
- milk eligibility report
- certificate report
- farm summary
- audit report
- blockchain verification report

Reports must use actual application/reference data.

---

# 37. PREFERRED TECHNOLOGY STACK

Preferred stack unless architecture research strongly justifies otherwise:

Frontend:

- React
- Vite

Backend:

- Node.js
- Express

Database:

- PostgreSQL

ORM:

- Prisma or another mature ORM if justified

Object storage:

- AWS S3
- private bucket
- presigned URLs

Blockchain:

- Solidity
- Hardhat or Anvil
- ethers or equivalent

Testing:

- backend unit tests
- API/integration tests
- frontend tests where valuable
- smart-contract tests
- end-to-end critical workflow tests

Deployment:

- Docker
- Docker Compose

---

# 38. ARCHITECTURE PRINCIPLES

Use modular/domain-oriented architecture.

Separate:

- frontend/UI
- API/controllers
- business/domain services
- persistence
- reference-data services
- S3 integration
- blockchain integration
- authentication/authorization
- audit services

Do not put major business logic directly inside:

- React components
- controllers
- database models

Prefer reusable domain services.

---

# 39. DATABASE PRINCIPLES

Use normalized relational design.

Potential entities include:

Authentication:

- users
- roles
- user_roles

Farm:

- farms
- farm_members
- farm_member_roles

Livestock:

- animals
- species
- breeds
- animal_health_records

Veterinary:

- veterinarian_profiles
- veterinarian_verification_documents
- veterinarian_service_areas
- treatment_requests
- veterinary_cases
- case_messages
- message_attachments
- diagnoses
- diseases
- prescriptions
- prescription_items
- treatments
- treatment_administrations

Reference:

- drugs
- drug_species
- regulatory_sources
- withdrawal_rules
- mrl_reference_rules
- reference_data_versions

Compliance:

- milk_eligibility_checks
- milk_eligibility_certificates

Monitoring:

- alerts
- audit_logs

Storage:

- file_objects / attachments

Blockchain:

- blockchain_anchors

Final schema must be designed during architecture phase rather than blindly
creating all listed tables.

---

# 40. FILE SECURITY

Uploaded files must be validated.

Validate where appropriate:

- allowed MIME types
- allowed extensions
- maximum file size
- ownership
- authorization

Generate unpredictable S3 object keys.

Do not trust original filenames as storage keys.

Private documents must not be publicly enumerable.

Veterinarian verification documents must only be accessible to authorized
administrators and the veterinarian where appropriate.

---

# 41. AUTHENTICATION AND AUTHORIZATION

Implement secure authentication.

Requirements include:

- password hashing
- secure authentication tokens/sessions
- RBAC
- farm-scoped authorization
- veterinarian-specific authorization
- admin-only verification operations
- resource ownership checks

Do not rely solely on frontend hiding.

Every protected backend operation must enforce authorization.

---

# 42. SECURITY

Implement:

- input validation
- SQL injection protection
- ORM parameterization
- secure headers
- appropriate CORS
- rate limiting where useful
- environment-variable secrets
- no committed credentials
- secure S3 access
- short-lived presigned URLs
- authorization tests
- careful logging

Do not log:

- passwords
- tokens
- AWS secret keys
- sensitive documents
- full authorization headers

---

# 43. GIT AND DEVELOPMENT WORKFLOW

Use Git throughout development.

Work phase-by-phase.

Do NOT attempt to implement the complete project in one uncontrolled task.

Before each phase:

1. Read AGENTS.md.
2. Read relevant documentation.
3. Inspect existing implementation.
4. Understand dependencies.
5. Preserve working functionality.

After each phase:

1. Run relevant tests.
2. Run lint/type checks.
3. Run builds where appropriate.
4. Fix failures.
5. Update documentation.
6. Review git diff.
7. Commit the completed phase.
8. Verify git status.

Do not continue with major unresolved failures.

---

# 44. GIT COMMIT GUIDELINES

Use meaningful commits.

Examples:

chore: initialize SIH25007 project

docs: add veterinary domain research

docs: add system architecture

feat: add authentication and farm RBAC

feat: add farm and animal management

feat: add veterinarian verification

feat: add S3 document storage

feat: add veterinarian discovery and treatment requests

feat: add veterinary case messaging

feat: add diagnosis and prescription workflow

feat: add treatment administration

feat: add withdrawal and milk eligibility engine

feat: add milk eligibility certificates

feat: add AMU monitoring

feat: add blockchain certificate anchoring

feat: add QR certificate verification

feat: add alerts and dashboards

feat: add audit and reporting

test: add end-to-end veterinary workflow

Do not rewrite/delete earlier Git history without explicit instruction.

---

# 45. DOCUMENTATION

Maintain documentation under:

docs/project/
docs/research/
docs/architecture/
docs/testing/
docs/deployment/

Documentation should eventually include:

- problem statement
- project scope
- business model
- role model
- requirements
- veterinary workflow
- research methodology
- data sources
- reference dataset
- database architecture
- API architecture
- veterinarian verification
- S3 architecture
- security
- withdrawal methodology
- milk eligibility methodology
- AMU methodology
- certificate architecture
- blockchain architecture
- QR verification
- testing
- deployment
- limitations
- future scope
- final demo procedure

---

# 46. RESEARCH-FIRST RULE

Before implementing veterinary/reference-dependent functionality:

RESEARCH
→ VERIFY
→ CITE
→ STRUCTURE DATA
→ REVIEW
→ IMPLEMENT

Never:

GUESS
→ HARD-CODE
→ PRESENT AS OFFICIAL

If network access is unavailable during required research:

STOP the domain-research phase and report that authoritative research could
not be completed.

Do not fabricate reference data to continue coding.

---

# 47. DEFINITION OF DONE

A feature is complete only when applicable layers are complete:

- database/schema
- migration
- backend API
- domain/business logic
- validation
- authorization
- frontend integration
- tests
- documentation
- Git commit

A screen alone does not mean a feature is complete.

---

# 48. PRIMARY END-TO-END DEMONSTRATION

The final system must support this scenario:

Platform Admin
→ verifies veterinarian credentials

Farm Owner
→ registers
→ creates farm
→ adds animal

Animal becomes ill

Farm Owner
→ creates treatment request
→ optionally attaches animal image
→ finds/selects verified veterinarian

Veterinarian
→ receives request
→ accepts request

System
→ creates veterinary case

Farmer ↔ Veterinarian
→ communicate through case chat

Veterinarian
→ examines/reviews animal
→ records diagnosis
→ creates prescription

Treatment
→ administered and recorded

System
→ records AMU information

Treatment
→ completed

System
→ selects applicable withdrawal rule
→ calculates withdrawal period

Animal
→ UNDER_WITHDRAWAL

Milk
→ NOT ELIGIBLE

Withdrawal period completes

System
→ re-evaluates animal
→ ELIGIBLE_FOR_MILK

System
→ generates Milk Eligibility Certificate
→ generates QR
→ creates deterministic certificate hash
→ anchors hash on blockchain
→ stores blockchain transaction reference

Dairy / authorized verifier
→ scans QR

System
→ retrieves certificate
→ verifies current certificate status
→ recalculates hash
→ verifies blockchain anchor

Result:
→ CERTIFICATE VALID
→ BLOCKCHAIN VERIFIED

Dashboards and reports update accordingly.

This is the project's primary acceptance workflow.

---

# 49. FINAL PROJECT PRINCIPLE

Every major module must support the central project story:

Responsible veterinary treatment
→ antimicrobial usage tracking
→ withdrawal enforcement
→ milk eligibility
→ verifiable certificate
→ trustworthy dairy collection

Do not add unrelated features simply to make the project appear larger.

Depth, integration, traceability, security, and explainability are more
important than feature count.
