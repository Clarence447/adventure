-- Tenant-safe customer onboarding for Revenue Recovery AI.
-- Apply with `supabase db push`; do not paste undocumented edits into production.

alter table public.businesses
  alter column owner_user_id set default auth.uid();

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'businesses_owner_user_id_fkey'
  ) then
    alter table public.businesses
      add constraint businesses_owner_user_id_fkey
      foreign key (owner_user_id) references auth.users(id) on delete cascade
      not valid;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'businesses_required_profile_check'
  ) then
    alter table public.businesses
      add constraint businesses_required_profile_check check (
        owner_user_id is not null
        and nullif(btrim(name), '') is not null
        and phone_number is not null
        and phone_number ~ '^\+[1-9][0-9]{7,14}$'
        and services is not null
        and cardinality(services) > 0
        and nullif(btrim(service_area), '') is not null
        and nullif(btrim(calendly_booking_link), '') is not null
        and nullif(btrim(google_review_link), '') is not null
      ) not valid;
  end if;
end
$$;

create unique index if not exists businesses_one_per_owner_idx
  on public.businesses(owner_user_id)
  where owner_user_id is not null;

create unique index if not exists businesses_phone_number_idx
  on public.businesses(phone_number)
  where phone_number is not null;

create index if not exists leads_business_id_idx on public.leads(business_id);
create index if not exists messages_business_id_idx on public.messages(business_id);
create index if not exists appointments_business_id_idx on public.appointments(business_id);

alter table public.businesses enable row level security;
alter table public.leads enable row level security;
alter table public.messages enable row level security;
alter table public.appointments enable row level security;

revoke all on table public.businesses, public.leads, public.messages, public.appointments from anon;
grant select, insert, update on table public.businesses, public.leads, public.messages, public.appointments to authenticated;

drop policy if exists "owner_selects_business" on public.businesses;
create policy "owner_selects_business"
  on public.businesses for select to authenticated
  using ((select auth.uid()) = owner_user_id);

drop policy if exists "owner_inserts_business" on public.businesses;
create policy "owner_inserts_business"
  on public.businesses for insert to authenticated
  with check ((select auth.uid()) = owner_user_id);

drop policy if exists "owner_updates_business" on public.businesses;
create policy "owner_updates_business"
  on public.businesses for update to authenticated
  using ((select auth.uid()) = owner_user_id)
  with check ((select auth.uid()) = owner_user_id);

drop policy if exists "owner_selects_leads" on public.leads;
create policy "owner_selects_leads"
  on public.leads for select to authenticated
  using (business_id in (
    select id from public.businesses where owner_user_id = (select auth.uid())
  ));

drop policy if exists "owner_inserts_leads" on public.leads;
create policy "owner_inserts_leads"
  on public.leads for insert to authenticated
  with check (business_id in (
    select id from public.businesses where owner_user_id = (select auth.uid())
  ));

drop policy if exists "owner_updates_leads" on public.leads;
create policy "owner_updates_leads"
  on public.leads for update to authenticated
  using (business_id in (
    select id from public.businesses where owner_user_id = (select auth.uid())
  ))
  with check (business_id in (
    select id from public.businesses where owner_user_id = (select auth.uid())
  ));

drop policy if exists "owner_selects_messages" on public.messages;
create policy "owner_selects_messages"
  on public.messages for select to authenticated
  using (business_id in (
    select id from public.businesses where owner_user_id = (select auth.uid())
  ));

drop policy if exists "owner_inserts_messages" on public.messages;
create policy "owner_inserts_messages"
  on public.messages for insert to authenticated
  with check (business_id in (
    select id from public.businesses where owner_user_id = (select auth.uid())
  ));

drop policy if exists "owner_updates_messages" on public.messages;
create policy "owner_updates_messages"
  on public.messages for update to authenticated
  using (business_id in (
    select id from public.businesses where owner_user_id = (select auth.uid())
  ))
  with check (business_id in (
    select id from public.businesses where owner_user_id = (select auth.uid())
  ));

drop policy if exists "owner_selects_appointments" on public.appointments;
create policy "owner_selects_appointments"
  on public.appointments for select to authenticated
  using (business_id in (
    select id from public.businesses where owner_user_id = (select auth.uid())
  ));

drop policy if exists "owner_inserts_appointments" on public.appointments;
create policy "owner_inserts_appointments"
  on public.appointments for insert to authenticated
  with check (business_id in (
    select id from public.businesses where owner_user_id = (select auth.uid())
  ));

drop policy if exists "owner_updates_appointments" on public.appointments;
create policy "owner_updates_appointments"
  on public.appointments for update to authenticated
  using (business_id in (
    select id from public.businesses where owner_user_id = (select auth.uid())
  ))
  with check (business_id in (
    select id from public.businesses where owner_user_id = (select auth.uid())
  ));
