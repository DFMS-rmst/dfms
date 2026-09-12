# Problem Statement

## Context

Dairy organizations need a trustworthy operational view of livestock treatment and milk collection eligibility. Farm records, veterinary interactions, prescriptions, actual medicine administrations, withdrawal rules, and collection decisions are often disconnected. This fragmentation makes antimicrobial usage difficult to analyze and makes it hard to explain why milk from an animal is or is not eligible at a given time.

## Problem

The project must provide one auditable workflow from farm and animal registration through verified veterinary care, actual treatment administration, AMU monitoring, withdrawal enforcement, milk eligibility, certificate issuance, QR verification, and limited blockchain proof.

The system must answer:

> Is milk from this animal currently eligible for collection based on its recorded treatment history and applicable verified withdrawal-period reference rules?

The answer must consider every relevant active or recent treatment, expose the rule and evidence used, and fail safely when a rule is missing or conflicting. It must never represent this decision as laboratory residue testing or measured MRL compliance.

## Stakeholders

- Dairy/cooperative/platform operator and its platform administrators
- Farm owners, managers, and authorized workers
- Veterinarians whose submitted credentials have been verified for platform access
- Dairy staff or public/authorized certificate verifiers receiving privacy-limited verification results

## Project objective

Build a serious academic prototype that improves traceability and responsible antimicrobial stewardship by integrating:

- farm, livestock, and health-record management;
- veterinarian onboarding, credential review, discovery, and case-based care;
- structured diagnosis, prescription, and actual administration records;
- scientifically defensible AMU monitoring and analytics;
- provenance-controlled veterinary and regulatory reference data;
- explainable withdrawal and milk-eligibility decisions;
- revocable/supersedable certificates with QR verification;
- a narrowly scoped blockchain integrity proof; and
- alerts, dashboards, reporting, RBAC, and immutable audit history.

## Success criterion

The primary demonstration succeeds when a verified veterinarian treats a registered animal, actual administrations feed AMU and withdrawal processing, the animal is blocked during treatment/withdrawal, later becomes rule-based eligible, receives a certificate, and that certificate is validated through QR and blockchain hash comparison without exposing private data.
