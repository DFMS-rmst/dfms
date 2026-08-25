# Frontend Structure

## Stack

React + Vite + JavaScript. ESLint and Prettier enforce style; Vitest and React Testing Library provide tests. No TypeScript application source is introduced.

## Planned structure

```text
frontend/src/
  app/             routing, providers, layouts, API client
  components/      shared accessible UI
  features/        domain feature slices
  pages/           route-level composition
  hooks/           reusable React hooks
  lib/             formatting, validation helpers
  styles/          tokens and global styles
  test/            test setup/helpers
```

Feature folders will mirror backend domains without duplicating business rules: auth, farms, animals, veterinarians, requests, cases, treatments, AMU, withdrawal, eligibility, certificates, alerts, dashboards, reports, and admin/reference review.

## State and API

Server state is fetched through a thin API client; a query library may be added when feature work begins. Access tokens should be held in memory, with refresh handled through the secure cookie endpoint. Farm context is explicit in routes and requests. Authorization errors come from the backend; frontend guards improve UX only.

## UI safeguards

- Show AMU metric name, formula/method version, numerator, denominator, unit, period, and limitations.
- Show withdrawal/eligibility sources and blocker explanations.
- Label MRL as reference-only and never display a measured result.
- Public QR verification uses a dedicated privacy-minimized page.
- Chat cannot create clinical records implicitly.

The initial shell includes product identity, milestone status, and API health display only. It does not contain fake dashboard statistics.
