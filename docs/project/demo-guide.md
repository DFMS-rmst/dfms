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

For local blockchain proof, run `npm run node --workspace blockchain` in a dedicated terminal, then run `npm run deploy:local --workspace blockchain` in another terminal. Copy only the disposable deployment address and a disposable Hardhat account key into the ignored local backend environment as documented in `blockchain/README.md`, then restart the backend.

Log in as the farm owner, open the demonstration farm and animal, discover the verified veterinarian, and review the completed veterinary case: request, chat, diagnosis, prescription, treatment, and actual administration. Show that AMU is driven by administration—not prescription. Complete/evaluate treatment, show withdrawal evidence and the current milk-eligibility state, issue a certificate only when eligible, display the PDF and QR, then anchor/verify its deterministic hash on the disposable local Hardhat network. Scan/open the public verification route and compare certificate validity with blockchain integrity.

Then show the negative animal: its missing/review-required rule blocks eligibility and certificate issuance. Emphasize that no guessed fallback is used.

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
