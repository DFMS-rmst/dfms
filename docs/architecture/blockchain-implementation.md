# Minimal Blockchain Implementation

## Deliberate scope

MySQL is the application source of truth. The EVM contract stores only a `bytes32` certificate-ID hash, a `bytes32` SHA-256 snapshot hash, timestamp, and issuer address. It stores no certificate JSON, people, farm records, animals, clinical facts, files, tokens, NFTs, or payments.

## Canonicalization and hash

`SIH-CERT-1.0` recursively sorts object keys, preserves array order, represents dates as ISO-8601 UTC strings, emits UTF-8 JSON without display-only fields, and computes SHA-256. The canonical payload and its version are saved with the certificate. Hash fields are the immutable snapshot documented in `certificate-system.md`; temporary URLs, live relations, current status, and anchor metadata are excluded.

## Contract and verification

`CertificateRegistry` authorizes configured anchorer addresses, rejects zero identifiers/hashes, prevents overwrite, emits an event, and exposes the stored proof. Backend verification first recomputes the saved snapshot hash, then compares the on-chain value. Results are `VERIFIED`, `TAMPERED`, `NOT_ANCHORED`, or `VERIFICATION_ERROR`.

## Consistency and retry

Certificate creation commits before anchoring. A unique MySQL proof record moves through `PENDING`, `ANCHORED`, or `FAILED`; attempts and sanitized error codes are retained. A failed proof never corrupts or rolls back eligibility/certificate state. Retry reuses the same record/hash, and an already anchored proof is returned idempotently. RPC URL, private key, contract address, and network are environment-only; tests use Hardhat or injected adapters.
