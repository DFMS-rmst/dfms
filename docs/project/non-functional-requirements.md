# Non-Functional Requirements

## Security and privacy

- **NFR-SEC-01:** Hash passwords using a proven adaptive algorithm and use secure session/token handling.
- **NFR-SEC-02:** Validate inputs, use ORM parameterization, secure headers, appropriate CORS, and proportionate rate limiting.
- **NFR-SEC-03:** Enforce authorization server-side with denial by default and test role, farm, assignment, ownership, and state boundaries.
- **NFR-SEC-04:** Keep S3 private, use least-privilege IAM, prefer workload IAM roles in AWS, and use short-lived presigned URLs only after authorization.
- **NFR-SEC-05:** Never expose or log passwords, tokens, secret keys, private keys, full authorization headers, or sensitive document contents.
- **NFR-SEC-06:** Public QR verification must minimize personal and clinical data.

## Data integrity and traceability

- **NFR-DATA-01:** MySQL is the source of truth; relational data should be normalized and constrained.
- **NFR-DATA-02:** Material decisions must be reproducible from versioned inputs, timestamps, selected reference rules, and explanations.
- **NFR-DATA-03:** Reference-data conflicts and missing values must be explicit and fail safe; no guessed regulatory/veterinary values.
- **NFR-DATA-04:** Audit and certificate history must be append-oriented and protected from ordinary modification/deletion.
- **NFR-DATA-05:** Certificate canonicalization and hashing must be deterministic across environments.

## Reliability and consistency

- **NFR-REL-01:** State transitions for requests, cases, treatments, eligibility, and certificates must be validated and transactionally consistent where needed.
- **NFR-REL-02:** Failures in alerts or blockchain anchoring must not silently corrupt the authoritative clinical/compliance record; they must be observable and retryable where safe.
- **NFR-REL-03:** New treatment or material rule changes must trigger dependable eligibility re-evaluation and certificate lifecycle handling.
- **NFR-REL-04:** Backups, restore procedures, and recovery objectives will be defined before deployment.

## Performance and scalability

- **NFR-PERF-01:** Common farm, case, animal, eligibility, and dashboard operations should provide responsive interactive use under the documented academic-demo workload.
- **NFR-PERF-02:** Analytics, reports, and eligibility queries must use persisted backend data and appropriate indexing/aggregation rather than fake client statistics.
- **NFR-PERF-03:** Large files should flow directly between authorized clients and S3 through presigned URLs instead of traversing application memory where practical.
- **NFR-PERF-04:** Concrete latency, concurrency, volume, and file-size targets will be baselined during architecture/testing planning.

## Maintainability and architecture

- **NFR-MAIN-01:** Use modular/domain-oriented boundaries for UI, API, domain services, persistence, reference data, S3, blockchain, auth, AMU, compliance, and audit.
- **NFR-MAIN-02:** Keep major business logic out of React components, controllers, and database models.
- **NFR-MAIN-03:** Use traceable requirement identifiers, migrations, tests, documentation, and meaningful phase commits when implementation begins.
- **NFR-MAIN-04:** Preserve configuration in environment variables with placeholder-only `.env.example`; production `.env` files remain uncommitted.

## Explainability and scientific integrity

- **NFR-EXP-01:** Every withdrawal/eligibility result must show its treatments, selected rules, provenance, evaluation time, outcome, and explanation to authorized users.
- **NFR-EXP-02:** AMU definitions and formulas must be documented, reproducible, and supported by available inputs and authoritative/peer-reviewed methodology.
- **NFR-EXP-03:** The product must distinguish recorded fact, veterinarian judgment, regulatory/reference information, calculated decision, analytical signal, and blockchain integrity result.
- **NFR-EXP-04:** Certificates and interfaces must not imply laboratory testing, measured residue absence, government veterinarian certification, or proven antimicrobial misuse.

## Usability and accessibility

- **NFR-UX-01:** Role-specific workflows should use clear status language and actionable explanations for blocking/review states.
- **NFR-UX-02:** Interfaces should follow accessible web practices, keyboard support, readable contrast, meaningful labels, and responsive layouts.
- **NFR-UX-03:** Dates, times, units, and jurisdiction context must be unambiguous.

## Testing and delivery quality

- **NFR-TEST-01:** Plan unit tests for domain logic; API/integration tests for validation, authorization, persistence, and S3 boundaries; frontend tests where valuable; smart-contract tests; and an end-to-end acceptance workflow.
- **NFR-TEST-02:** Security tests must cover privilege escalation, cross-farm access, veterinarian status/assignment, private object authorization, and public verification data minimization.
- **NFR-TEST-03:** Eligibility tests must cover overlapping treatments, active treatment, missing/conflicting rules, time boundaries, rule revisions, and certificate revocation/supersession.
- **NFR-TEST-04:** Each phase must pass relevant tests, lint/type checks, and builds before proceeding with unresolved major failures.

## Compliance boundary

The prototype supports organizational operations and academic evaluation. It must not claim legal certification, clinical decision automation, laboratory residue assurance, or regulatory approval.

