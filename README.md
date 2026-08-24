# Revenue Recovery AI

Revenue Recovery AI is a local-service-business SaaS for missed-call lead recovery. The product texts missed callers, records replies, qualifies the service need, and hands qualified leads to the configured booking flow.

## Current production slice: tenant-safe onboarding

This branch adds the first production dependency for every downstream automation:

1. An owner signs up with Supabase email/password authentication.
2. Auth cookies are refreshed server-side and protected routes verify JWT claims.
3. The owner completes a required business profile: name, E.164 receiving number, services, service area, booking link, and review link.
4. Supabase Row Level Security limits businesses, leads, messages, and appointments to the authenticated owner.
5. The owner can sign out, sign back in, view the protected dashboard, and update settings.

This slice does **not** claim that Twilio capture, OpenAI qualification, Stripe entitlement, or ROI reporting is production-ready. Those remain separate Issue #1 slices.

## Stack

- Next.js / TypeScript / Tailwind CSS
- Supabase Auth and Postgres RLS
- Twilio, OpenAI, and Stripe dependencies for later Issue #1 slices
- Vercel deployment target

## Local setup

```bash
npm install
cp .env.example .env.local
supabase start
supabase db reset
npm run dev
```

Use `supabase db push` for a linked non-local environment. Do not manually paste undocumented schema changes into production.

## Supabase Auth configuration

Add the local and deployed origins to Supabase Auth redirect URLs. Confirmation and recovery links return through `/auth/confirm` and are restricted to known in-app destinations.

Required public variables:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

`NEXT_PUBLIC_SUPABASE_ANON_KEY` remains a fallback for existing Supabase projects. `SUPABASE_SERVICE_ROLE_KEY` must remain server-side and is not used to authorize customer pages.

## Verification

```bash
npm run lint
npm run typecheck
npm test
npm run build
supabase test db
```

The pgTAP test proves anonymous denial and Customer A/Customer B isolation for business and lead records. CI runs application checks and the local Supabase policy suite.

## Existing product routes

The existing `/bellpro` route is preserved. This slice does not rebrand Revenue Recovery AI, add ClawOps, or change BellPro content.

## Remaining Issue #1 work

- Signed, tenant-routed, idempotent Twilio missed-call and inbound-SMS capture
- STOP-family suppression at the final send boundary
- Schema-validated OpenAI qualification with deterministic fallback
- Stripe billing and entitlement enforcement
- Booking reconciliation and reproducible customer ROI metrics

Production credentials, billing activation, phone-number configuration, and compliance approval remain operator-controlled launch steps.
