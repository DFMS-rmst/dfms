# API Design

## Conventions

- Base path: `/api/v1`
- JSON request/response bodies; multipart uploads are avoided for private S3 objects.
- Zod validates params, query, and body at the API boundary.
- Access JWT in `Authorization: Bearer`; rotating refresh token in a secure, HTTP-only, same-site cookie.
- Standard error shape: `{ "error": { "code", "message", "details", "requestId" } }`.
- Cursor pagination for high-volume timelines; bounded page pagination for small reference lists.
- Idempotency keys for certificate issuance and other retry-sensitive commands.

## Initial routes

The scaffold implements only `GET /api/v1/health`. Planned route families:

| Route family                             | Responsibility                                                |
| ---------------------------------------- | ------------------------------------------------------------- |
| `/auth`                                  | register, login, refresh rotation, logout, password workflows |
| `/users`                                 | profile and admin user operations                             |
| `/farms`, `/farms/:farmId/members`       | self-created farms and farm-scoped roles                      |
| `/farms/:farmId/animals`                 | livestock and health history                                  |
| `/veterinarians`, `/admin/veterinarians` | registration, discovery, verification                         |
| `/files`                                 | authorized presigned PUT/GET and completion                   |
| `/treatment-requests`                    | request lifecycle and assignment                              |
| `/veterinary-cases`                      | cases, messages, diagnoses, prescriptions                     |
| `/treatments`                            | treatment lifecycle and actual administrations                |
| `/amu`                                   | farm/platform metrics with method and denominator metadata    |
| `/withdrawal`, `/eligibility`            | explainable evaluations and review queues                     |
| `/certificates`                          | eligibility-gated issue/lifecycle                             |
| `/verify/certificates/:verificationId`   | privacy-limited public verification                           |
| `/alerts`, `/reports`, `/audit`          | authorized monitoring/export/history                          |
| `/reference-data`                        | verified/versioned records; admin governance                  |

## Authorization pattern

Each protected request resolves an authenticated principal, platform roles, farm membership roles, resource scope, veterinarian verification/assignment, and current record state. Controllers call policy functions before services. Public verification uses a dedicated projection rather than serializing internal certificate entities.

## State-changing operations

Services validate allowed transitions, use a MySQL transaction, append an audit record/domain event, and return the new authoritative state. Chat never causes clinical records automatically. Prescription creation never implies administration.

## Files

`POST /files/upload-intents` validates entity, ownership, MIME, size, and extension, creates `PENDING_UPLOAD` metadata, and returns a short-lived presigned PUT. `POST /files/:id/complete` verifies object metadata before marking available. `POST /files/:id/download-intents` authorizes and returns a short-lived GET.

## Eligibility response

Authorized responses include status, evaluation time, every relevant treatment, selected rule/version/source, withdrawal end, blocker codes, and explanation. They never include a residue result. Certificate issuance requires a fresh `ELIGIBLE_FOR_MILK` evaluation within a configured validity window.
