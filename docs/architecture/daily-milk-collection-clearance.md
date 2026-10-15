# Daily Milk Collection Clearance

## Meaning and boundaries

Animal **Milk Eligibility** remains the authoritative Stage 3 determination. A **Daily Milk Collection Clearance** is a farm-and-business-date snapshot that aggregates those current animal results. It is not a laboratory residue test, a government certificate, proof that physical milk came from the listed animals, or a replacement for the withdrawal engine.

The operational document states: according to treatment records and withdrawal-reference rules recorded in this system, the listed animals were eligible when that immutable clearance version was generated.

## Business date

The backend derives `YYYY-MM-DD` with `Intl.DateTimeFormat` using `Farm.timeZone` (default `Asia/Kolkata`). The persisted evaluation stores both the business date and timezone. UTC calendar dates are not used as farm dates.

## Morning and first-access flow

The lightweight in-process scheduler runs on backend startup and every 15 minutes. It processes active farms independently; `Promise.allSettled` prevents one farm failure from terminating the batch. A persistent `DailyEligibilityJob` records running, completed, or failed state per farm/date. Repeated processing is idempotent.

As a safety net, an authorized farm user's first read creates today's result if it is absent. Owners/managers can also invoke the same service with **Run today's eligibility evaluation** for demonstrations. Neither path accepts an animal list or eligibility override.

## Animal selection and evaluation

Only animals belonging to the farm with `status=ACTIVE` and `lactating=true` are applicable. Every applicable animal is passed through the existing authoritative eligibility service. Only `ELIGIBLE_FOR_MILK` is included. `TREATMENT_ACTIVE`, `UNDER_WITHDRAWAL`, `RULE_NOT_FOUND`, and `REVIEW_REQUIRED` are excluded individually with a private reason.

A blocking animal does not block unrelated eligible animals. If zero animals qualify, the daily evaluation is persisted but no positive clearance/PDF is created.

## Persistence and versioning

`DailyFarmEligibilityEvaluation` is the immutable farm/date/version header. `DailyFarmEligibilityItem` normalizes each included or excluded animal and links the exact `MilkEligibilityCheck`. Human-readable animal identifiers, evaluated time, eligible-from time, blocking reason, and withdrawal end are snapshotted.

At most one version is logically `CURRENT`. If the deterministic evidence hash is unchanged, the current version is reused and no duplicate alert is emitted. If evidence changes, the old version becomes `SUPERSEDED`, points to the new version, and remains historical. Previous business dates are never modified by a current-day treatment.

Stage 3 eligibility persistence calls the daily change hook only when today's evaluation already exists. This lets a newly active treatment or changed evidence produce a new same-day version without creating daily documents for farms that have not entered the daily workflow.

## Clearance, PDF, QR, and privacy

A positive `DailyMilkCollectionClearance` is generated automatically from an evaluation that has at least one eligible animal. The farmer does not select animals. Its human-readable number includes business date, a non-secret farm fragment, and version. Public access uses a separate random opaque verification identifier.

The PDF contains the farm, business date/timezone, version, counts, eligible animal tags, QR, and prominent disclaimer. Public verification exposes only farm identity, date, version, operational status, eligible count, document integrity, and disclaimer. It does not expose diagnoses, prescriptions, treatments, chats, private users, or database identifiers.

## Canonical integrity and blockchain

Canonicalization reuses the project's sorted-key JSON approach and SHA-256. Immutable clearance fields include schema version, farm snapshot, business date/timezone, evaluated timestamp, counts, animal eligibility snapshots, clearance number, version, and disclaimer.

Daily clearances are not anchored automatically. An owner or manager may explicitly anchor the canonical hash of the current immutable daily-clearance version through the existing minimal proof registry. Workers, veterinarians, and unrelated users cannot request this action. The existing individual certificate blockchain flow and `MEC-DEMO-0001` remain unchanged. Blockchain integrity confirms only that the stored snapshot matches its proof; it never represents eligibility, laboratory testing, milk safety, or current operational validity. If a local disposable Hardhat chain is restarted, demo-only recovery may clear stale proof metadata and re-anchor the unchanged snapshot without altering farm, treatment, or eligibility data.

## Authorization and alerts

Active farm owners, managers, and workers may read the operational list. Only owners/managers may invoke the safe refresh action. There is no manual eligibility selection or override. The existing alert table supplies one deduplicated readiness/change alert per farm/date/version, shown in the farm view.
