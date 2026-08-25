# Private S3 Storage

## Storage model

AWS S3 stores veterinarian credentials, profile/animal images, treatment-request attachments, and limited case-message attachments. The bucket is private with block-public-access enabled. MySQL stores `FileObject` metadata: unpredictable object key, MIME type, size, checksum where available, owner/entity links, status, and timestamps.

No permanent public S3 URL is stored. AWS credentials never enter frontend configuration.

## Upload flow

1. Authenticated client requests an upload intent with entity, purpose, MIME, extension, and size.
2. Backend verifies RBAC/ownership, allowlist, size limit, and entity state.
3. Backend generates a cryptographically unpredictable key and creates `PENDING_UPLOAD` metadata.
4. Backend returns a short-lived presigned PUT constrained to the approved key/content type.
5. Client uploads directly to S3.
6. Client calls completion; backend HEADs the object, verifies expected metadata/size, and marks it `AVAILABLE`.

## Download flow

The backend authorizes each request, records sensitive access when appropriate, and returns a short-lived presigned GET. Veterinarian verification documents are visible only to the submitting veterinarian and authorized platform reviewers.

## Security controls

- S3 block-public-access and least-privilege backend IAM.
- Prefer IAM task/instance roles in AWS; environment credentials only for local development.
- Key pattern includes environment/purpose/date/random UUID, never an original filename.
- MIME and extension allowlists, file-size limits, checksums, and content scanning hook.
- Encryption at rest and TLS in transit.
- Lifecycle cleanup for abandoned uploads and retention policy for historical evidence.
- CORS limited to configured frontend origins and required methods/headers.

## Local behavior

The scaffold does not require live AWS credentials for health/startup. S3 integration remains disabled until configured; endpoints must fail closed rather than emit mock public URLs.
