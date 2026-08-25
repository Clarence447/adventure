begin;
create extension if not exists pgtap with schema extensions;
select plan(5);

insert into auth.users (id, email)
values
  ('33333333-3333-3333-3333-333333333333', 'migration-a@example.com'),
  ('44444444-4444-4444-4444-444444444444', 'migration-b@example.com');

insert into public.businesses (
  id, owner_user_id, name, phone_number, services, service_area,
  calendly_booking_link, google_review_link
)
values
  (
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    '33333333-3333-3333-3333-333333333333',
    'Migration A', '+14075550707', array['Service A'], 'Orlando',
    'https://example.com/book-c', 'https://example.com/review-c'
  ),
  (
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    '44444444-4444-4444-4444-444444444444',
    'Migration B', '+14075550808', array['Service B'], 'Kissimmee',
    'https://example.com/book-d', 'https://example.com/review-d'
  );

insert into public.leads (id, business_id, phone)
values
  ('cccccccc-3333-3333-3333-333333333333', 'cccccccc-cccc-cccc-cccc-cccccccccccc', '+14075550909'),
  ('dddddddd-4444-4444-4444-444444444444', 'dddddddd-dddd-dddd-dddd-dddddddddddd', '+14075551010');

alter table public.messages
  drop constraint messages_lead_business_id_fkey;
alter table public.appointments
  drop constraint appointments_lead_business_id_fkey;

insert into public.messages (business_id, lead_id, direction, body)
values (
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  'dddddddd-4444-4444-4444-444444444444',
  'inbound',
  'legacy cross-tenant message'
);

insert into public.appointments (business_id, lead_id, calendly_event_uri)
values (
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  'dddddddd-4444-4444-4444-444444444444',
  'https://example.com/events/legacy-cross-tenant'
);

select is(
  (
    select count(*)::integer
    from (
      select message.id
      from public.messages as message
      join public.leads as lead on lead.id = message.lead_id
      where message.business_id is distinct from lead.business_id
      union all
      select appointment.id
      from public.appointments as appointment
      join public.leads as lead on lead.id = appointment.lead_id
      where appointment.business_id is distinct from lead.business_id
    ) as mismatches
  ),
  2,
  'legacy fixture contains both cross-tenant mismatch types'
);

alter table public.messages
  add constraint messages_lead_business_id_fkey
  foreign key (lead_id, business_id)
  references public.leads(id, business_id)
  on delete cascade
  not valid;

alter table public.appointments
  add constraint appointments_lead_business_id_fkey
  foreign key (lead_id, business_id)
  references public.leads(id, business_id)
  on delete cascade
  not valid;

select is(
  (
    select count(*)::integer
    from pg_constraint
    where conname in (
      'messages_lead_business_id_fkey',
      'appointments_lead_business_id_fkey'
    )
      and not convalidated
  ),
  2,
  'both foreign keys can be installed before legacy cleanup'
);

update public.messages as message
set business_id = lead.business_id
from public.leads as lead
where message.lead_id = lead.id
  and message.business_id is distinct from lead.business_id;

update public.appointments as appointment
set business_id = lead.business_id
from public.leads as lead
where appointment.lead_id = lead.id
  and appointment.business_id is distinct from lead.business_id;

select is(
  (
    select count(*)::integer
    from (
      select message.id
      from public.messages as message
      join public.leads as lead on lead.id = message.lead_id
      where message.business_id is distinct from lead.business_id
      union all
      select appointment.id
      from public.appointments as appointment
      join public.leads as lead on lead.id = appointment.lead_id
      where appointment.business_id is distinct from lead.business_id
    ) as mismatches
  ),
  0,
  'legacy rows are reconciled to their lead tenant'
);

alter table public.messages
  validate constraint messages_lead_business_id_fkey;
alter table public.appointments
  validate constraint appointments_lead_business_id_fkey;

select is(
  (
    select count(*)::integer
    from pg_constraint
    where conname in (
      'messages_lead_business_id_fkey',
      'appointments_lead_business_id_fkey'
    )
      and convalidated
  ),
  2,
  'both tenant foreign keys validate after cleanup'
);

select throws_ok(
  $$insert into public.messages (business_id, lead_id, direction, body)
    values (
      'cccccccc-cccc-cccc-cccc-cccccccccccc',
      'dddddddd-4444-4444-4444-444444444444',
      'inbound',
      'new cross-tenant message'
    )$$,
  '23503',
  null,
  'validated tenant foreign key rejects new mismatches'
);

select * from finish();
rollback;
