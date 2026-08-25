# SIH25007 Livestock AMU and Milk Eligibility Platform

This repository is the planning foundation for a B.Tech final-year academic prototype that connects responsible veterinary care, antimicrobial usage (AMU) monitoring, withdrawal enforcement, rule-based milk eligibility, and verifiable dairy-collection certificates.

The intended operator is a dairy cooperative, private dairy, milk collection organization, dairy union, or organized livestock service provider. Farmers and verified veterinarians use the platform; the platform administrator represents the operating organization, not a government authority.

## Current phase

Project initialization and planning only. No application stack, database, object storage, blockchain network, or veterinary reference dataset has been scaffolded or implemented.

Start with:

- [Problem statement](docs/project/problem-statement.md)
- [Project scope](docs/project/project-scope.md)
- [Business model](docs/project/business-model.md)
- [User roles](docs/project/user-roles.md)
- [Functional requirements](docs/project/functional-requirements.md)
- [Non-functional requirements](docs/project/non-functional-requirements.md)
- [Module breakdown](docs/project/module-breakdown.md)
- [End-to-end workflow](docs/project/end-to-end-workflow.md)
- [Implementation roadmap](docs/project/implementation-roadmap.md)

## Fixed boundaries

- AMU monitoring and analytics is a first-class core module based on actual treatment administrations.
- Milk eligibility is derived from recorded treatment history and verified, provenance-bearing withdrawal rules; it is not laboratory residue certification.
- There is no laboratory module, residue measurement, simulated lab result, or AI diagnosis.
- PostgreSQL is planned as the application source of truth. Blockchain is limited to integrity proofs, primarily certificate hashes.
- Private documents and images are planned for a private AWS S3 bucket using authorized, short-lived presigned URLs.
- No veterinary, dosage, MRL, or withdrawal values may be guessed or hard-coded.

## Security note

Copy `.env.example` to a local ignored environment file only when implementation begins. Never commit credentials, passwords, private keys, tokens, or production environment files.

