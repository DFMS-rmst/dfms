# System Architecture

## Decision summary

The platform is a JavaScript monorepo with a React/Vite client, an Express API, MySQL accessed through Prisma, private AWS S3 object storage, and a small Solidity proof contract accessed through ethers. MySQL is the application source of truth. The blockchain contains only selected hashes and proof metadata.

## Runtime view

```text
Browser (React/Vite)
   │ HTTPS + access JWT
   v
Express API
   ├── domain/application services ──> Prisma ──> MySQL
   ├── authorized file service ──────> AWS S3 presigned PUT/GET
   ├── certificate proof adapter ────> ethers ──> EVM contract
   └── scheduled/event jobs ─────────> eligibility, alerts, proof retries
```

The frontend never connects directly to MySQL, signs JWTs, receives AWS credentials, or writes to blockchain. It may upload/download private objects directly only after the API authorizes the operation and returns a short-lived presigned URL.

## Bounded modules

The backend contains modules for auth, users, farms, animals, veterinarians, files, reference data, treatment requests, veterinary cases/chat, diagnoses, prescriptions, treatments/administrations, AMU, withdrawal, eligibility, certificates/QR, alerts, audit, and blockchain proof.

Controllers translate HTTP requests. Application services coordinate use cases. Domain services own state transitions and calculations. Repositories/Prisma own persistence. External adapters isolate S3 and blockchain.

## Core event chain

```text
verified veterinarian + farm animal
  -> treatment request -> veterinary case -> diagnosis -> prescription
  -> actual administrations -> AMU facts
  -> treatment completion -> verified withdrawal-rule selection
  -> whole-history eligibility -> certificate -> QR -> optional hash anchor
```

An application transaction writes authoritative state and an outbox-style domain event where later asynchronous handling is appropriate. Alerts, eligibility re-evaluation, and blockchain retries must be observable and idempotent.

## Non-negotiable boundaries

- No laboratory module, sample/result model, residue measurement, or measured-residue claim.
- MRL records are reference-only and never determine milk eligibility.
- AMU is a core pipeline based on actual administrations, with active-ingredient mass and exposure metrics—not frontend treatment counts.
- Only verified veterinarians accept assigned requests or create official diagnoses/prescriptions.
- A user may hold multiple farm roles; owners normally create their own farms.
- Missing/conflicting withdrawal evidence blocks eligibility and certificates.
- Foreign research rules are jurisdiction-bound and cannot silently match India.

## Deployment units

- `frontend`: static Vite build served by a web server in production.
- `backend`: stateless Express container; scale horizontally after shared database/object storage are configured.
- `mysql`: MySQL 8.4 container for local development.
- `blockchain`: Hardhat development workspace; a local node is optional and separate from core API health.

Docker Compose starts MySQL, backend, and frontend. The blockchain network is opt-in because eligibility data remains valid even when anchoring is unavailable.

## Reliability approach

- Database transactions protect state transitions and audit/outbox writes.
- Unique idempotency keys prevent repeated issuance/administration side effects.
- Eligibility stores rule and treatment snapshots for reproducibility.
- S3 metadata has upload lifecycle states so abandoned presigned uploads can be reconciled.
- Blockchain anchors have `PENDING`, `ANCHORED`, and `FAILED` status with retry metadata.
- All timestamps are UTC; farm time zone is retained for display and daily AMU aggregation.
