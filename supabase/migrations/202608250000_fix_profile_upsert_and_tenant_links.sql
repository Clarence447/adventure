-- Repair the two tenant-onboarding defects identified after PR #6.

-- PostgREST can infer this index for on_conflict=owner_user_id only when it is
-- not partial. PostgreSQL unique indexes still permit multiple null values.
drop index if exists public.businesses_one_per_owner_idx;
create unique index businesses_one_per_owner_idx
  on public.businesses(owner_user_id);

-- A child row's lead and business must identify the same tenant. Keep the
-- existing single-column foreign keys for compatibility and add the invariant.
alter table public.leads
  add constraint leads_id_business_id_key unique (id, business_id);

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

-- NOT VALID makes both constraints enforce new writes immediately without
-- rejecting the migration because of legacy rows. Repair those rows from the
-- referenced lead, which is the canonical tenant owner, then validate.
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

alter table public.messages
  validate constraint messages_lead_business_id_fkey;

alter table public.appointments
  validate constraint appointments_lead_business_id_fkey;
