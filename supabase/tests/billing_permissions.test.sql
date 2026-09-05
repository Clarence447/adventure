begin;
create extension if not exists pgtap with schema extensions;
select plan(5);
insert into auth.users (id, email) values ('55555555-5555-5555-5555-555555555555', 'billing-test@example.com');
set local role authenticated;
set local request.jwt.claim.sub = '55555555-5555-5555-5555-555555555555';
select lives_ok($$insert into public.businesses (owner_user_id, name, phone_number, services, service_area, calendly_booking_link, google_review_link)
values ('55555555-5555-5555-5555-555555555555', 'Billing test', '+14075559999', array['Repair'], 'Orlando', 'https://example.com/book', 'https://example.com/review')
on conflict (owner_user_id) do update set name = excluded.name$$, 'profile upsert still works with column grants');
select throws_ok($$update public.businesses set subscription_status = 'active'$$, '42501', null, 'owner cannot self-activate billing');
select throws_ok($$update public.businesses set stripe_customer_id = 'cus_forged'$$, '42501', null, 'owner cannot replace billing identity');
select throws_ok($$insert into public.businesses (owner_user_id, name, subscription_status) values ('55555555-5555-5555-5555-555555555555', 'Forged', 'active')$$, '42501', null, 'insert cannot set billing state');
select lives_ok($$update public.businesses set name = 'Updated profile'$$, 'owner can still update profile');
select * from finish();
rollback;
