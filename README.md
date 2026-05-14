# ClawOps AI Command Center

ClawOps is an OpenClaw-style agent command center prototype for connecting chat channels, tools, approvals, and business workflows into one supervised automation workspace.

The app presents a polished landing page, an agent launch request flow, and the existing BellPro strategy companion page. The original missed-call recovery services remain available as integration building blocks for future API routes.

## Stack

- Next.js
- TypeScript
- Custom CSS
- Supabase
- Twilio
- OpenAI API
- Calendly booking link support
- Vercel deployable

## Core Experience

1. Operator lands on the ClawOps command-center homepage.
2. The page explains the private agent workspace, channel routing, approval guardrails, and workflow loop.
3. Operator opens `/signup` to describe the first agent mission.
4. Future implementation can persist launch requests to Supabase, trigger OpenAI planning, and connect Twilio or chat-channel automations.
5. Existing Twilio, Supabase, and OpenAI helper modules can support revenue recovery, inbox triage, and booking workflows.

## Setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Run the SQL in `supabase/schema.sql` inside the Supabase SQL editor.

## Required Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
OPENAI_API_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Twilio Webhooks

Missed call webhook:

```txt
https://your-domain.com/api/twilio/missed-call
```

Inbound SMS webhook:

```txt
https://your-domain.com/api/twilio/inbound-sms
```

Both should use `POST`.

## Production Hardening Checklist

- Add authentication.
- Add multi-tenant business ownership.
- Add editable settings form.
- Add Twilio request signature validation.
- Add rate limiting.
- Add retry/error logging.
- Add Calendly appointment webhook.
- Add SMS opt-out handling.
- Add TCPA-safe consent language.
- Add Stripe subscription billing.

## Compliance Note

SMS follow-up must comply with Twilio policies, carrier rules, and applicable consent requirements. Do not spam. Do not message people without a legitimate customer inquiry or consent basis.
