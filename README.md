# SIH25007 Livestock AMU and Milk Eligibility Platform

JavaScript/MySQL monorepo for a B.Tech final-year academic prototype connecting veterinary care, actual antimicrobial usage (AMU), withdrawal enforcement, rule-based milk eligibility, certificates, QR verification, and limited blockchain integrity proof.

## Workspaces

- `frontend` — React + Vite JavaScript shell
- `backend` — Express JavaScript API, Prisma, MySQL
- `blockchain` — Solidity + Hardhat + ethers proof contract
- `data/reference` — provenance-bearing researched reference artifacts; no invented seed values
- `docs` — project, research, and architecture documentation

## Prerequisites

- Node.js 22+
- npm 10+
- Docker Desktop/Engine with Compose

## Setup

```bash
npm install
cp .env.example .env
npm run prisma:generate
npm run prisma:validate
npm run db:seed --workspace backend
npm test
npm run lint
npm run build
docker compose up --build
```

MySQL is exposed on host port `3307` by default to avoid conflicts with a locally installed MySQL service. Set `MYSQL_PORT` to override it; containers continue to use port `3306` internally.

On Windows PowerShell, use `Copy-Item .env.example .env` instead of `cp`. Fill only local development values in `.env`; it is ignored by Git. Compose supplies safe local-container values when no root `.env` exists.

- Frontend: `http://localhost:5173`
- Backend health: `http://localhost:3000/api/v1/health`

## Local development without Docker

```bash
npm run dev:backend
npm run dev:frontend
```

Set `DATABASE_URL` to a reachable MySQL database before running database readiness or migrations.

The default seed imports only the researched cattle and buffalo species records. Set `SEED_DEMO_DATA=true` explicitly to add local-only demo accounts (`admin@example.local` and `farmer@example.local`, password `DemoOnly!234`). Never use these credentials outside local development.

## Platform foundation API

- `/api/v1/auth`: registration, login, refresh rotation, logout, and current user
- `/api/v1/farms`: authorized farms and farm membership roles
- `/api/v1/farms/:farmId/animals`: farm-scoped animal profiles and history foundation
- `/api/v1/veterinarians`: veterinarian profile submission
- `/api/v1/admin/veterinarians`: administrator review and verification decisions
- `/api/v1/files`: private S3 upload, completion, and download intents

## Veterinary workflow API

- `/api/v1/veterinarians`: verified-only discovery with district, service-area, specialization, and name filters
- `/api/v1/treatment-requests`: farm-authorized creation/list/detail and controlled accept/reject/cancel transitions
- `/api/v1/veterinary-cases`: participant-only case detail, persisted chat, diagnoses, and prescriptions
- `/api/v1/treatments`: treatment lifecycle and separate actual administration records
- `/api/v1/reference-data`: researched disease and drug selectors
- `/api/v1/alerts`: role-scoped in-app workflow alerts
- `/api/v1/farms/:farmId/animals/:animalId/timeline`: stored clinical workflow history

S3 is optional for local startup and mocked in tests. Real uploads require a private bucket and backend-only AWS configuration; the frontend never receives AWS credentials.

## Quality commands

```bash
npm test
npm run lint
npm run build
npm run prisma:validate
npm run prisma:generate
```

`npm run db:check` verifies backend-to-MySQL connectivity. `npm run db:migrate` applies committed migrations.

## Fixed safety boundaries

- MySQL is authoritative; blockchain stores only selected hashes/proofs.
- Private files use backend-authorized, short-lived S3 presigned URLs.
- AMU comes from actual administrations and supports mass/exposure metrics.
- Milk eligibility uses verified withdrawal rules across all relevant treatments.
- MRL is reference-only. There is no laboratory or measured-residue module.
- Only verified, assigned veterinarians can accept requests and create official diagnoses/prescriptions.

See [system architecture](docs/architecture/system-architecture.md) and [research summary](docs/research/research-summary.md).

## Demonstration readiness

The deterministic local seed (`SEED_DEMO_DATA=true`) creates `admin@example.local`, `farmer@example.local`, and `vet@example.local` with local-only password `DemoOnly!234`; the farmer is both owner and manager. It adds a completed veterinary story, actual administration-driven AMU evidence, an eligible certificate-capable animal, and a rule-missing blocked animal. Never deploy these credentials.

India is the normal fail-closed jurisdiction. The named demonstration farm alone may use an exact foreign product record already present in `data/reference/`; resulting evidence and certificate snapshots carry **DEMONSTRATION REFERENCE — NOT AN INDIAN REGULATORY RULE**. A foreign rule is never silently substituted for India.

For the narrated flow and safe local reset, see [demo guide](docs/project/demo-guide.md). Security conclusions are in [security review](docs/security/security-review.md) and [dependency review](docs/security/dependency-review.md); final commands and results are in [final test report](docs/testing/final-test-report.md).

Production deployment additionally requires HTTPS, managed secrets, a shared/distributed rate limiter, hardened S3/IAM policy, backups, and a dedicated blockchain signer. Local Hardhat accounts are disposable development identities only.

## AI intelligence layer

The optional `ml/` FastAPI service provides two separate capabilities behind Express authorization:

- Isolation Forest AMU pattern anomaly indicators derived from actual administrations. The bundled model uses **SYNTHETIC DEMONSTRATION DATA** and never claims misuse, diagnosis, or disease probability.
- Local TF-IDF retrieval over approved `docs/research/` and `data/reference/` content with provenance.

The Smart Advisor combines retrieved static knowledge with separately authorized live MySQL context, then calls a configurable OpenAI-compatible provider. Configure `LLM_API_URL`, `LLM_API_KEY`, and `LLM_MODEL` only in an ignored environment file. Without a key, the advisor returns a clear unavailable response and never fabricates an answer.

`docker compose up --build` starts MySQL, the ML/retrieval service, Express, and React. ML remains decision support: the deterministic withdrawal/eligibility engine alone controls milk eligibility and certificate issuance.
