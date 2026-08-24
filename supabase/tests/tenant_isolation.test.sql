begin;
create extension if not exists pgtap with schema extensions;
select plan(9);

insert into auth.users (id, email)
values
  ('11111111-1111-1111-1111-111111111111', 'owner-a@example.com'),
  ('22222222-2222-2222-2222-222222222222', 'owner-b@example.com');

insert into public.businesses (
  id, owner_user_id, name, phone_number, services, service_area,
  calendly_booking_link, google_review_link
)
values
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '11111111-1111-1111-1111-111111111111',
    'Business A', '+14075550101', array['Service A'], 'Orlando',
    'https://example.com/book-a', 'https://example.com/review-a'
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    '22222222-2222-2222-2222-222222222222',
    'Business B', '+14075550202', array['Service B'], 'Kissimmee',
    'https://example.com/book-b', 'https://example.com/review-b'
  );

insert into public.leads (business_id, phone)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '+14075550303'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '+14075550404');

insert into public.messages (business_id, lead_id, direction, body)
select business_id, id, 'inbound', 'test message'
from public.leads;

insert into public.appointments (business_id, lead_id, calendly_event_uri)
select business_id, id, 'https://example.com/events/' || id::text
from public.leads;

set local role anon;
select throws_ok(
  $$select * from public.businesses$$,
  '42501',
  null,
  'anonymous visitors cannot read businesses'
);

set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';

select results_eq(
  $$select name from public.businesses order by name$$,
  array['Business A'],
  'owner A can read only business A'
);

select results_eq(
  $$select phone from public.leads order by phone$$,
  array['+14075550303'],
  'owner A can read only business A leads'
);

select results_eq(
  $$select count(*)::integer from public.messages$$,
  array[1],
  'owner A can read only business A messages'
);

select results_eq(
  $$select count(*)::integer from public.appointments$$,
  array[1],
  'owner A can read only business A appointments'
);

select is_empty(
  $$update public.businesses set name = 'Compromised' where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' returning id$$,
  'owner A cannot update business B'
);

select throws_ok(
  $$insert into public.leads (business_id, phone) values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '+14075550505')$$,
  '42501',
  null,
  'owner A cannot create a lead for business B'
);

select throws_ok(
  $$insert into public.businesses (owner_user_id, name, phone_number, services, service_area, calendly_booking_link, google_review_link)
    values ('22222222-2222-2222-2222-222222222222', 'Forgery', '+14075550606', array['Service'], 'Florida', 'https://example.com/book', 'https://example.com/review')$$,
  '42501',
  null,
  'owner A cannot create a business for owner B'
);

set local request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select results_eq(
  $$select name from public.businesses order by name$$,
  array['Business B'],
  'owner B can read only business B'
);

select * from finish();
rollback;
