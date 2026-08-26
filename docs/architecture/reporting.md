# Dashboards and Reporting

Role-aware dashboard endpoints aggregate live MySQL records. Farm users are farm-scoped; veterinarians are scoped to assigned-case farms; platform administrators receive organization aggregates. Views cover animals, active requests/cases/treatments, eligibility states, certificates, alerts, AMU summary/trends, veterinarian verification, usage by class/farm, proof health, reference review cases, and recent audit activity.

Core reports are farm AMU, organization AMU, animal treatment history, withdrawal/milk eligibility, certificates, veterinary activity, administrator audit, and blockchain verification. Date and farm filters are supported where applicable, and CSV is available without introducing a generic report engine. Certificate PDFs are the formal PDF output for this milestone.

AMU reports call the existing AMU dataset/formula functions. Eligibility reports read the persisted engine evidence/history. Certificate reports use immutable snapshots and lifecycle history. Blockchain reports read proof attempts/status. This shared-service approach prevents conflicting totals or compliance decisions.

Reports do not contain laboratory results or measured residue/MRL claims. MRL remains a separate educational reference view.
