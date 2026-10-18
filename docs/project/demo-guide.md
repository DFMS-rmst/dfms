# Demonstration guide

## Safety statement

This demonstration contains no laboratory workflow and makes no measured-residue or measured-MRL claim. Normal Indian operation remains fail-closed when an exact verified rule is unavailable. A foreign product rule may be used only on the isolated demonstration farm and must display:

> DEMONSTRATION REFERENCE — NOT AN INDIAN REGULATORY RULE

## Start

1. Copy `.env.example` to `.env` and fill local-only values.
2. Run `docker compose up --build -d`.
3. Apply migrations with `npm run db:migrate`.
4. Run `SEED_DEMO_DATA=true npm run db:seed --workspace backend` (PowerShell: `$env:SEED_DEMO_DATA='true'` for that terminal).
5. Open `http://localhost:5173`; health is at `http://localhost:3000/api/v1/health`.

Local demo password: `DemoOnly!234`. Accounts are `admin@example.local`, `farmer@example.local`, and `vet@example.local`. Never use them outside local development.

## Primary story

The core demonstration operates completely out-of-the-box without requiring a running Hardhat node or blockchain credentials. All document and certificate integrity is backed by deterministic canonical serialization and SHA-256 cryptographic proofs.

Log in as the farm owner, open the demonstration farm and animal, discover the verified veterinarian, and review the completed veterinary case: request, chat, diagnosis, prescription, treatment, and actual administration. Show that AMU is driven by administration—not prescription. Complete/evaluate treatment, show withdrawal evidence and the current milk-eligibility state, issue a certificate only when eligible, and display the PDF and QR. Scan/open the public verification route to inspect the certificate validity and its canonical SHA-256 document integrity proof.

Then show the negative animal: its missing/review-required rule blocks eligibility and certificate issuance. Emphasize that no guessed fallback is used.

Optional reference: If an evaluator explicitly requests smart contract anchoring, the `blockchain/` workspace contains the compiled `CertificateRegistry.sol` contract and tests (`npm run test:blockchain`). A local Hardhat node can optionally be started via `npm run node --workspace blockchain`.

## Daily milk collection workflow

1. Open the farm workspace and choose **Today's Milk Eligibility**.
2. Show the system-determined eligible and blocked lactating-animal lists. There are no farmer eligibility checkboxes or overrides.
3. If at least one animal qualifies, download the automatically generated **Daily Milk Collection Clearance** PDF and scan its QR. The public page exposes only farm/date/version/count, operational status, canonical document integrity status, and the disclaimer.
4. Start a treatment for an included animal through the veterinarian workflow. Return to today's view and show the new current version excluding that animal, the preserved historical version, and the farm alert.

Animal Milk Eligibility, a Daily Milk Collection Clearance, laboratory residue testing, and cryptographic document integrity are distinct concepts. The application contains no laboratory module. Existing individual certificates, including `MEC-DEMO-0001`, remain historical animal-level evidence; the daily clearance is the farm/date operational document.

## Reset

`docker compose down -v` removes the local MySQL volume. Then repeat start, migration, and seed. This is destructive only to local Docker demo data.

## Expected limitations

- AWS is optional locally; real private uploads require a configured private bucket. Automated tests mock AWS.
- Blockchain anchoring requires a running disposable Hardhat node, deployed contract, and local environment variables.
- Demonstration withdrawal evidence is jurisdiction-specific and is not an Indian regulatory claim.
- No laboratory testing, residue measurement, AI diagnosis, tokens, NFTs, or cryptocurrency exists.

## AI milestone demonstration

1. Open **AI Advisor**, select the authorized demonstration farm, and evaluate farm AMU pattern risk.
2. Enter an authorized animal ID to show the animal-level feature vector, risk band, model version, contributing indicators, and decision-support disclaimer.
3. Explain that the model was trained on **SYNTHETIC DEMONSTRATION DATA** and that HIGH means unusual relative to that distribution—not misuse, diagnosis, or a regulatory breach.
4. Configure a local/test LLM provider key, then ask an eligibility question. Show the answer's live-platform context label and approved research sources.
5. Remove the provider key and show the graceful unavailable message rather than a fabricated answer.
6. Attempt an unrelated farm/animal scope and show that Express denies access before ML retrieval or LLM invocation.
7. Return to the milk eligibility/certificate screen and emphasize that AI results have not changed the deterministic state.
