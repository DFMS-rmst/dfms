# Business Model and Platform Ownership

## Operator/customer

The platform is business-to-organization infrastructure for an operator such as a dairy cooperative, private dairy, milk collection organization, dairy union, or organized livestock service provider. The operator purchases, governs, and administers the platform to improve veterinary coordination, antimicrobial stewardship, withdrawal enforcement, and collection traceability.

Farmers and veterinarians are essential platform users, but an individual farmer is not assumed to purchase or operate the complete system.

## Platform administration

`PLATFORM_ADMIN` represents authorized staff of the operating organization. It is not a government role and must not be presented as one. Administrators manage users, verify submitted veterinarian credentials for platform access, oversee reference-data governance, monitor AMU and compliance workflows, review audit evidence, and handle rule/verification exceptions.

Veterinarian verification means the operator has reviewed submitted credentials against available evidence. It is not legal or government certification.

## Farm participation model

Farm owners normally self-register, create their farms, add animals, invite farm members, and connect to verified veterinarians. An operator may configure farm approval statuses (`PENDING`, `ACTIVE`, `SUSPENDED`, `REJECTED`), but routine farm creation must not depend on administrators manually creating each farm.

Authorization belongs to both user and farm context. The same person may be owner and manager of one farm, while holding a different or no role at another farm.

## Value proposition

- Farmers receive organized access to verified veterinarians, treatment history, withdrawal alerts, eligibility status, certificates, and farm-level AMU insight.
- Veterinarians receive structured requests, cases, communication, prescribing, administration follow-up, and relevant AMU/withdrawal context.
- Operators receive traceable compliance decisions, cross-farm AMU analytics, reference-data health, certificate monitoring, audit review, and integrity verification.
- Dairy verifiers receive a privacy-limited certificate status rather than private farm or medical records.

## Trust model

PostgreSQL remains the operational source of truth. Private files remain in private S3 storage. Reference rules require provenance and review. Audit history explains material actions. Blockchain only provides an immutable comparison point for selected hashes, principally milk-eligibility certificates; it neither owns workflow state nor establishes medical or regulatory truth.

## Sustainability assumptions

Commercial pricing is outside this planning phase. A future operating model could use organization licensing, deployment/support services, or farm-volume tiers, but must preserve farmer access, data protection, veterinarian independence, and truthful certificate limitations.

