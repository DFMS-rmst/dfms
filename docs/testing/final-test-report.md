# Final verification report

Date: 2026-08-26

This report records the final hardening run. The authoritative command output is the current terminal/CI log; never infer a pass from this document alone.

| Check                                | Result                                                        |
| ------------------------------------ | ------------------------------------------------------------- |
| Prisma validate/generate             | Passed with Prisma 6.12.0                                     |
| MySQL migrations/status/connectivity | Passed; 10 migrations, schema current, connectivity OK        |
| Reference import/validation          | Passed during idempotent seed/import                          |
| Backend tests                        | 32 passed across 8 files                                      |
| Frontend tests/build                 | 2 passed across 2 files; Vite production build passed         |
| Solidity compile/tests               | Compile passed; 4 contract tests passed                       |
| Lint/format/diff check               | Lint and configured formatting passed; diff check passed      |
| Backend/frontend startup             | Compose services healthy; frontend and API returned HTTP 200  |
| Secret scan                          | Passed targeted tracked-content scan; no credential values    |
| Dependency audit                     | 0 critical; 17 high development-toolchain findings documented |

Coverage includes authentication/RBAC, private S3 authorization, veterinary workflow integrity, AMU from administrations, multi-treatment withdrawal/eligibility, certificate blocking/issuance/revocation, PDF/QR projection, canonical hashing, local proof contract behavior, dashboard/report authorization, and negative missing/review-required rule behavior.
