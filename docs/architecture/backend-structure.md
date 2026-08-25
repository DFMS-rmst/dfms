# Backend Structure

## Stack

Node.js + Express + JavaScript (ES modules), Prisma configured for MySQL, Zod validation, Pino logging, Helmet/CORS, Vitest/Supertest, AWS SDK v3, ethers, and QR generation support when certificate work begins.

## Structure

```text
backend/src/
  app.js                Express composition
  server.js             process startup/shutdown
  config/               validated environment
  common/               errors, middleware, utilities
  infrastructure/       Prisma, S3, blockchain adapters
  modules/<domain>/     controller, routes, service, policy/repository as needed
```

Initial module folders cover all 21 requested capabilities. Empty placeholder indexes describe boundaries without pretending that features are implemented.

## Layer responsibilities

- Routes/controllers: HTTP mapping and Zod validation.
- Application services: use-case orchestration and transactions.
- Domain services/policies: authorization, state machines, AMU, withdrawal, eligibility, and canonicalization.
- Repositories/infrastructure: Prisma, S3, ethers, clocks, and queues.
- Middleware: request IDs, logging, auth parsing, error mapping, security headers.

## Health and lifecycle

`GET /api/v1/health` reports API process health and optionally database readiness without exposing secrets. Startup validates environment configuration, creates reusable clients, and handles `SIGTERM`/`SIGINT` gracefully.

## Testing strategy

- Unit tests for policies/state/calculation services.
- Supertest API tests for validation and authorization.
- MySQL integration tests for transactions and constraints.
- Contract tests in the blockchain workspace.
- End-to-end tests for the acceptance workflow later.

The scaffold test verifies health without requiring MySQL; a separate readiness/connectivity command validates MySQL when Docker is available.
