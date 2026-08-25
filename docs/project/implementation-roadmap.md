# Implementation Roadmap

This roadmap is phase-gated. The current initialization/planning phase creates documentation only. Each later phase begins by rereading `AGENTS.md` and relevant documents, and ends with tests/checks, documentation, diff review, a meaningful commit, and clean status unless the user directs otherwise.

## Phase 0 — Initialization and planning (current)

- Define problem, ownership, scope, roles, requirements, modules, acceptance workflow, roadmap, ignore rules, and placeholder environment contract.
- Do not scaffold or research domain values.
- Exit gate: consistency review against `AGENTS.md` and user approval.

## Phase 1 — Authoritative domain research

- Research relevant MVP species, diseases, antimicrobials, ingredients/classes, drug-species relationships, withdrawal rules, MRL references, restricted substances, AMU methodologies, and jurisdictions.
- Prioritize FSSAI, DAHD/Ministry sources, Codex/JECFA, FAO, WHO, WOAH, and suitable peer-reviewed literature.
- Define provenance, conflict, verification, and versioning policy; select a small defensible demonstration dataset.
- If authoritative access is unavailable, stop rather than fabricate data.
- Exit gate: cited research and reviewed structured-data proposal; no application implementation based on unverified values.

## Phase 2 — System architecture and threat model

- Finalize bounded modules, normalized schema, API contracts, state machines, authorization matrix, audit model, background work, and deployment topology.
- Design private S3 flows, file validation, AMU methodology, withdrawal/eligibility explainability, certificate canonicalization, QR privacy view, and limited blockchain anchoring.
- Define measurable performance, recovery, retention, testing, and security requirements.
- Exit gate: reviewed architecture and traceability from requirements to components/tests.

## Phase 3 — Workspace and development foundation

- Scaffold the approved React/Vite, Node.js/Express, MySQL/ORM, testing, lint/type, Docker, and configuration structure.
- Establish migrations, error handling, validation, logging redaction, and CI checks.
- Exit gate: foundation builds/tests with no domain feature shortcuts.

## Phase 4 — Authentication, RBAC, farms, and livestock

- Implement secure authentication, multi-role farm authorization, farm lifecycle/membership, animals, health history, and authorization tests.
- Exit gate: cross-farm and privilege-escalation protections verified.

## Phase 5 — Veterinarian verification and private S3 files

- Implement veterinarian profiles/status workflow, admin review, private object metadata, presigned upload/download, validation, and access tests.
- Exit gate: only verified vets receive clinical capabilities; private documents remain non-public.

## Phase 6 — Discovery, requests, cases, and communication

- Implement verified-vet discovery, treatment request state transitions, assigned acceptance, case lifecycle, persisted chat, attachments, and alerts.
- Exit gate: authorized request-to-case workflow passes integration tests without automatic clinical decisions.

## Phase 7 — Reference-data foundation, diagnosis, and prescription

- Load only the reviewed cited MVP reference dataset and implement governance/version/conflict states.
- Implement assigned verified-vet diagnosis and structured prescriptions with clinical/reference separation.
- Exit gate: provenance is queryable; missing data is explicit; no invented dosage/rules.

## Phase 8 — Treatment administration and core AMU

- Implement actual administrations and treatment lifecycle.
- Implement first-class AMU calculations, breakdowns, trends, farm/platform views, and reports using the approved scientific methodology.
- Add only metrics supported by captured inputs; document formula limitations.
- Exit gate: AMU is reproducible from administration records and is not reduced to optional/simple frontend counts.

## Phase 9 — Withdrawal and milk eligibility

- Implement rule selection, explainable calculation, overlapping-treatment evaluation, safe missing/conflict states, scheduled/event re-evaluation, and alerts.
- Exit gate: active, overlapping, boundary-time, missing-rule, conflict, and re-evaluation tests pass.

## Phase 10 — Certificates and QR verification

- Implement eligibility-gated certificate issuance, mandatory disclaimer, lifecycle/history, QR identifiers, privacy-limited verification, and automatic revocation/supersession.
- Exit gate: no blocked state can issue a certificate and new treatment invalidates current eligibility appropriately.

## Phase 11 — Limited blockchain proof

- Implement deterministic canonicalization, SHA-256 certificate hash anchoring on the selected local Ethereum-compatible network, transaction metadata, retry/failure handling, and comparison outcomes.
- Exit gate: tamper tests work; MySQL remains authoritative; no private/full records are on-chain.

## Phase 12 — Alerts, dashboards, reporting, and audit completion

- Complete role/farm-scoped operational alerts, actual-data dashboards, required reports, reference-health/verification monitoring, and protected audit coverage.
- Exit gate: dashboard totals reconcile with persisted records and authorization applies to views/exports.

## Phase 13 — Hardening and primary acceptance demonstration

- Complete security, integration, frontend, smart-contract, and end-to-end tests; performance baseline; backup/recovery and deployment documentation.
- Exercise the full admin verification → farm/animal → request/case/chat → diagnosis/prescription → administration/AMU → withdrawal → eligibility → certificate/QR/blockchain workflow.
- Exit gate: acceptance evidence, limitations, final demo procedure, and no major unresolved failures.

## Optional future phase

- Evaluate anomaly detection only after core AMU works. It must label system thresholds as analytical and phrase results as unusual patterns requiring veterinary review, never as proven misuse.
- Consider read-only regulator access, GPS proximity, or certificate expiry only through separately approved scope and privacy/business analysis.

## Known planning risks and decision points

- Authoritative Indian withdrawal information may be incomplete, product/formulation-specific, or conflicting; safe review states and deliberate demo-dataset selection are essential.
- AMU metrics depend on reliable administration quantities, units, animal populations/weights, and scientifically accepted denominators; scope must follow research and data feasibility.
- Operator policy is needed for farm approval, treatment-record correction, certificate revocation versus supersession, optional expiry, data retention, and public farm-name display.
- Time zones, exact administration/completion instants, inclusive/exclusive withdrawal boundaries, and rule version changes require explicit architecture decisions.
- S3 availability and blockchain anchoring are external failure domains; workflows need observable retry and non-misleading status behavior.

