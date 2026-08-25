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
