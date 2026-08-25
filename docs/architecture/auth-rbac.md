# Authentication and RBAC

## Authentication decision

Use short-lived signed access JWTs (target 10-15 minutes) and opaque rotating refresh tokens. Only a SHA-256 hash of each refresh token is stored in MySQL. Refresh tokens are delivered in `HttpOnly`, `Secure` (production), `SameSite=Lax` cookies with a narrow path. Rotation revokes the old token and detects reuse by token family.

Passwords use Argon2id with environment-calibrated parameters. JWT signing keys/secrets are backend-only environment values. Logout revokes the token/session family. Rate limits apply to authentication and public verification endpoints.

## Authorization layers

1. Authentication: valid access token and active user.
2. Platform role: e.g. `PLATFORM_ADMIN`.
3. Farm membership: active membership for the resource farm.
4. Farm role: `FARM_OWNER`, `FARM_MANAGER`, `FARM_WORKER`; multiple roles are allowed.
5. Resource relationship: owner, assigned worker, requested/assigned veterinarian.
6. Professional state: veterinarian must be `VERIFIED`.
7. Workflow state: action allowed from the current record status.

## Role rules

- Farmers register and create their own farms. Admin creation is exceptional, not the default.
- An owner may simultaneously have the manager role.
- Workers have explicit operational permissions and cannot diagnose, prescribe, verify veterinarians, or govern reference data.
- Only the requested/assigned verified veterinarian may accept a request and create official diagnoses/prescriptions.
- `PLATFORM_ADMIN` represents the dairy/operator, not government.

## Permission implementation

Policies receive a normalized principal and resource facts and return allow/deny plus a stable reason code. Services repeat critical invariants inside the transaction to avoid time-of-check/time-of-use errors. Queries are always scoped by farm or assignment; authorization never depends solely on frontend visibility.

## Security events

Audit login success/failure at a privacy-safe level, refresh reuse, role/membership changes, veterinarian verification decisions, and sensitive file access. Never log passwords, raw tokens, full authorization headers, AWS credentials, or private document bodies.
