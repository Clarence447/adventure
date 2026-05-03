# Revenue Recovery AI

Revenue Recovery AI is a local business missed-call and lead follow-up MVP.

It instantly texts missed callers, captures their service need, uses OpenAI to qualify the lead, updates the CRM, and sends a booking link.

## Stack

- Next.js
- TypeScript
- Tailwind CSS
- Supabase
- Twilio
- OpenAI API
- Calendly booking link support
- Vercel deployable

## Core Workflow

1. Customer calls business.
2. Missed call webhook hits `/api/twilio/missed-call`.
3. System creates or updates a lead.
4. System sends SMS: `Hi, sorry we missed your call. What service do you need help with today?`
5. Customer replies.
6. Twilio sends inbound SMS to `/api/twilio/inbound-sms`.
7. System saves inbound message.
8. OpenAI classifies service need, urgency, location, and lead score.
9. System replies with next step and booking link.
10. CRM lead status is updated.

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
