# GlucoLink

An all-in-one blood sugar tracking and remote-monitoring platform for patients and care teams. The current product slice is a responsive patient dashboard with validated manual reading capture and a deliberately separated clinical data model.

## Product choices

- **B2B2C tenancy:** subscriptions belong to an organization, not to protected patient records. This supports clinic billing, seats, and hospital expansion.
- **Commission ledger:** commissions are immutable, in minor currency units and tied to a subscription; never calculate clinician payouts from mutable percentages at display time.
- **Clinical safety:** glucose trends and estimated A1c are educational decision-support signals, not medical advice. Production alert rules need clinician-configurable thresholds and escalation policies.
- **Privacy:** free-text notes are modeled as encrypted fields. Use application-layer envelope encryption with KMS in production; do not put encryption keys in the database.

## Before launch

1. Add Better Auth/Clerk and enforce organization + patient-care-team authorization in every route.
2. Add Prisma migrations, PostgreSQL Row-Level Security, encrypted backups, audit event pipeline and retention policies.
3. Implement rate limiting, CSRF/session protections, FCM consent flows, HIPAA/DPDP vendor agreements, and a clinical safety review.
4. Replace the demo dashboard seed with authenticated React Query endpoints and generate alert rules asynchronously.

## Local setup

Copy `.env.example` to `.env`, supply a PostgreSQL database, then run `pnpm install`, `pnpm prisma generate`, and `pnpm dev`.
