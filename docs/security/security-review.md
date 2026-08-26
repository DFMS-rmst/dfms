# Final security review

Reviewed on 2026-08-26 against the academic prototype threat model.

## Implemented controls

- Passwords use Argon2id; plaintext passwords are never stored.
- Short-lived JWT access tokens and rotating, revocable, hashed refresh-token records are used. Logout revokes the token family.
- Authorization is enforced by backend platform-role, farm-membership, ownership, assigned-veterinarian, and verification checks.
- Express JSON limits, Zod request schemas, Prisma parameterization, Helmet, restricted credentialed CORS, and request IDs protect the API boundary.
- Authentication endpoints are limited to 30 requests per IP per minute; public certificate verification is limited to 120.
- Logs redact authorization and cookie headers. Passwords, tokens, AWS secrets, blockchain keys, private object contents, and presigned URLs must not be logged.
- S3 objects are private. The backend validates MIME type and size, generates unpredictable keys, and authorizes short-lived PUT/GET URLs. Tests mock AWS.
- QR/public verification returns a deliberately reduced certificate projection and never an S3 key, private health history, chat, or identity credentials.
- Certificate hashes use versioned canonical JSON. MySQL remains authoritative; the chain contains only an identifier/hash proof.
- Audit records are append-only through application services and are not editable by ordinary users.
- Prisma migrations constrain relational ownership; domain services enforce lifecycle transitions and cross-resource consistency.
- `.env` is ignored and `.env.example` contains names/placeholders only. Repository scans must be run before release.

## Residual risks and deployment obligations

- The in-memory rate limiter is per process. A production multi-instance deployment needs a shared store or gateway limit.
- Refresh tokens are supported in an HTTP-only cookie flow; production must use HTTPS, secure cookies, strict origins, and managed secrets.
- Presigned PUT size is validated before signing, but S3 bucket policy/lifecycle and post-upload metadata checks remain deployment responsibilities.
- Administrator account bootstrapping and key rotation need an operator runbook before real deployment.
- Blockchain private keys must use a secret manager or dedicated signer; local Hardhat keys are for disposable development networks only.
- Foreign product withdrawal records are enabled only on explicitly flagged demonstration farms and carry a prominent non-Indian warning. Indian mode remains fail-closed when no exact verified rule exists.
- This is an academic prototype and has not undergone third-party penetration testing.
