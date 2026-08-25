# End-to-End Workflow

## Primary acceptance scenario

1. **Platform veterinarian verification**
   - A veterinarian registers separately and submits professional details and a credential document.
   - The private document is planned for S3; MySQL retains metadata/object identity only.
   - An authorized platform administrator reviews the submission and records an auditable decision.
   - Only `VERIFIED` status enables discovery and official clinical actions. This is platform-access verification, not government certification.

2. **Farm and animal onboarding**
   - A farm owner registers, creates a farm, completes its profile, and adds an animal.
   - The owner may invite a manager/worker and may personally hold both owner and manager roles.
   - Every action is farm-scoped; optional farm approval follows operator configuration.

3. **Veterinary assistance request**
   - An authorized farm user observes illness, selects the animal, records symptoms/notes and urgency, and optionally attaches a private image.
   - The user discovers only verified veterinarians using service-area and professional filters and selects one.
   - The requested veterinarian receives an alert and may accept or reject only if still verified and assigned.

4. **Case and communication**
   - Acceptance creates/activates a veterinary case with a lifecycle independent of the eventual treatment.
   - Authorized farm users and the assigned veterinarian exchange persisted, case-specific messages and limited private attachments.
   - Chat does not automatically create diagnosis, prescription, treatment, or a compliance decision.

5. **Diagnosis and prescription**
   - The assigned verified veterinarian explicitly records a diagnosis and clinical notes.
   - The veterinarian creates a structured prescription using appropriate reference links and their own clinical instructions.
   - The platform does not diagnose from symptoms or invent dose recommendations.

6. **Treatment administration and AMU capture**
   - An authorized person records each actual administration separately from the prescription.
   - Administration facts feed the core AMU pipeline: drug, ingredient/class, animal/species, disease context, farm, quantity where reliable, duration, and time.
   - AMU dashboards and reports use persisted administrations and documented metrics. Advanced anomaly detection is not required for the core workflow.

7. **Treatment completion and withdrawal**
   - Treatment completion triggers selection of an applicable verified withdrawal rule from the reference layer.
   - The engine records the selected version/source, treatment end, duration, withdrawal end, evaluation time, result, and explanation.
   - The animal is `TREATMENT_ACTIVE` during active treatment and `UNDER_WITHDRAWAL` until all relevant withdrawal periods end.
   - If a required rule is absent or conflicting, the outcome is `RULE_NOT_FOUND` or `REVIEW_REQUIRED`; no value is guessed.

8. **Whole-history milk eligibility**
   - The engine evaluates every relevant active/recent treatment, not merely the latest.
   - Any active treatment, active withdrawal, missing/conflicting rule, or configured blocker prevents eligibility.
   - Once no blocker remains, the animal becomes `ELIGIBLE_FOR_MILK` based on recorded history and configured verified rules—not laboratory residue testing.

9. **Certificate, QR, and integrity proof**
   - Only an eligible animal receives a unique milk-eligibility certificate with rule evidence and the mandatory no-laboratory disclaimer.
   - The certificate receives a non-guessable verification ID and QR route.
   - Selected certificate data is deterministically serialized and SHA-256 hashed; only the hash and minimal metadata are anchored on an Ethereum-compatible proof layer.
   - MySQL retains the full authoritative certificate and blockchain transaction reference.

10. **Verification and continued re-evaluation**
    - A dairy/authorized verifier scans the QR and sees a privacy-limited certificate summary and current state.
    - The system recomputes the certificate hash and compares it with the anchor, returning `VERIFIED`, `TAMPERED`, `NOT_ANCHORED`, or `VERIFICATION_ERROR`.
    - A later treatment or blocking change triggers re-evaluation and may revoke/supersede the certificate without deleting its history.
    - Dashboards, alerts, reports, and audit records reflect each material transition.

## Decision sequence

```text
Actual treatment administrations
        │
        ├──> AMU processing and analytics
        │
Treatment completion
        │
        v
Verified withdrawal-rule lookup
        │
        ├── missing/conflicting ──> REVIEW/RULE_NOT_FOUND ──> certificate blocked
        │
        v
All relevant treatments evaluated
        │
        ├── active blocker ──> NOT ELIGIBLE ──> certificate blocked
        │
        v
ELIGIBLE_FOR_MILK
        │
        v
Certificate + QR + limited hash anchor
```

## No-laboratory boundary

At no point is a sample collected, residue measured/predicted, MRL compliance inferred from a measurement, or laboratory report produced. MRL may appear only as separately labelled educational reference information. Withdrawal-period compliance is a rule-and-record decision.

