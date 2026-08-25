# Blockchain Proof Design

## Scope

The EVM layer is an optional integrity proof for selected records, primarily a milk-eligibility certificate hash. MySQL remains authoritative for certificate content, status, clinical history, audit logs, and users. No tokens, NFTs, payments, full records, documents, or personal data go on-chain.

## Contract

`CertificateRegistry` stores a record identifier hash, SHA-256 content hash represented as `bytes32`, anchor timestamp, and issuer address. Duplicate anchor behavior is explicit. Contract events enable transaction discovery. Access control initially uses an owner/authorized anchorer suitable for the academic prototype.

## Canonicalization

The backend constructs a versioned canonical payload containing only the defined certificate fields and rule snapshot, orders keys deterministically, encodes UTF-8, and computes SHA-256. The canonicalization version and payload/hash are stored with the certificate so future code changes do not alter historical verification.

## Anchor flow

1. MySQL commits the certificate as authoritative.
2. A domain event schedules anchoring.
3. Backend sends the hash through ethers.
4. `BlockchainAnchor` records chain ID, contract, transaction hash, block, status, attempt count, and error category.
5. Failure leaves the certificate valid according to database status but displays `NOT_ANCHORED`/`VERIFICATION_ERROR`; retry is idempotent.

## Verification

Recompute the database certificate hash using its canonicalization version, retrieve the anchor, and compare. Results are `VERIFIED`, `TAMPERED`, `NOT_ANCHORED`, or `VERIFICATION_ERROR`. Blockchain verification does not prove medical correctness, residue absence, or current eligibility; current certificate status is checked separately.

## Development

Hardhat and ethers provide contract compilation/testing and an optional local network. The contract workspace is not required for baseline frontend/backend health. Secrets/private keys remain in ignored environment files.
