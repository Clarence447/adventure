-- Operator-owned prospects, separate from each customer's recovered leads.
create table public.acquisition_requests (
  submission_id uuid primary key,
  business_name text not null,
  contact_name text not null,
  email text not null,
  phone text not null default '',
  answers jsonb not null,
  consent_at timestamptz not null default now(),
  consent_version text not null default 'enquiry-contact-v1',
  created_at timestamptz not null default now()
);
create index acquisition_requests_email_created_idx on public.acquisition_requests(email, created_at);
alter table public.acquisition_requests enable row level security;
revoke all on public.acquisition_requests from public, anon, authenticated;
grant select, insert on public.acquisition_requests to service_role;

create function public.submit_acquisition_request(payload jsonb)
returns text language plpgsql security invoker set search_path = '' as $$
declare
  normalized_email text := lower(btrim(payload->>'email'));
  normalized_phone text := coalesce(payload->>'phone', '');
  submitted_answers jsonb := payload - array['submission_id', 'business_name', 'contact_name', 'email', 'phone', 'consent'];
  existing public.acquisition_requests%rowtype;
begin
  if payload->>'consent' is distinct from 'true' then
    raise exception 'Contact consent is required';
  end if;
  -- Serialize per email so concurrent requests cannot bypass the hourly cap.
  perform pg_advisory_xact_lock(hashtextextended(normalized_email, 0));
  select * into existing
  from public.acquisition_requests
  where submission_id = (payload->>'submission_id')::uuid;
  if found then
    if existing.business_name = payload->>'business_name'
      and existing.contact_name = payload->>'contact_name'
      and existing.email = normalized_email
      and existing.phone = normalized_phone
      and existing.answers = submitted_answers then
      return 'received';
    end if;
    return 'submission_mismatch';
  end if;
  if (select count(*) from public.acquisition_requests where email = normalized_email and created_at > now() - interval '1 hour') >= 3 then
    return 'rate_limited';
  end if;
  insert into public.acquisition_requests (submission_id, business_name, contact_name, email, phone, answers)
  values ((payload->>'submission_id')::uuid, payload->>'business_name', payload->>'contact_name', normalized_email,
    normalized_phone, submitted_answers);
  return 'received';
end;
$$;
revoke all on function public.submit_acquisition_request(jsonb) from public, anon, authenticated;
grant execute on function public.submit_acquisition_request(jsonb) to service_role;
