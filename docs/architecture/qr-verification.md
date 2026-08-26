# QR and Public Verification

Each certificate receives a cryptographically random, URL-safe 192-bit verification identifier. Its QR contains only `${APP_BASE_URL}/verify/certificate/:verificationId`; it never contains medical history, certificate JSON, AWS locations, secrets, or private veterinarian/farmer data.

The public API returns certificate number, animal tag, farm name, species, issue/eligible-from dates, certificate status, source organizations captured in the snapshot, blockchain integrity status, and the no-laboratory disclaimer. It uses an explicit projection so internal IDs, contact details, documents, chat, audit records, object keys, and authentication data cannot leak.

The public page visually separates `Certificate Status` from `Blockchain Integrity`. A revoked but unchanged certificate can therefore correctly show `REVOKED` and `VERIFIED`. Neither QR nor blockchain establishes current eligibility independently of the MySQL certificate lifecycle.
