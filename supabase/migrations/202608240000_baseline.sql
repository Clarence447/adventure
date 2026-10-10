create extension if not exists "uuid-ossp" with schema extensions;

create table if not exists public.businesses (
  id uuid primary key default extensions.uuid_generate_v4(),
  owner_user_id uuid,
  name text not null,
  phone_number text,
  services text[] default '{}',
  service_area text,
  calendly_booking_link text,
  google_review_link text,
  stripe_customer_id text,
  subscription_status text default 'trial',
  created_at timestamptz default now()
);

create table if not exists public.leads (
  id uuid primary key default extensions.uuid_generate_v4(),
  business_id uuid references public.businesses(id) on delete cascade,
  name text,
  phone text not null,
  service_needed text,
  urgency text,
  location text,
  status text default 'new',
  lead_score integer default 0,
  source text default 'missed_call',
  notes text,
  opted_out boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (business_id, phone)
);

create table if not exists public.messages (
  id uuid primary key default extensions.uuid_generate_v4(),
  business_id uuid references public.businesses(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete cascade,
  direction text not null,
  channel text default 'sms',
  body text not null,
  twilio_message_sid text,
  compliance_status text default 'sent',
  created_at timestamptz default now()
);

create table if not exists public.appointments (
  id uuid primary key default extensions.uuid_generate_v4(),
  business_id uuid references public.businesses(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete cascade,
  calendly_event_uri text,
  scheduled_time timestamptz,
  status text default 'scheduled',
  created_at timestamptz default now()
);
