-- Coach portal (2026-10-19): one client record per person, group-class
-- attendance, one-to-one sessions and packages, online coaching, and a
-- manual payment ledger (charges, payments, allocations, refunds).
--
-- Same access model as akb_booking_requests: RLS on with no policies and no
-- privileges for anon/authenticated, so only the site's server (secret key,
-- after requireCoach()) can read or write. Functions are not executable by
-- the public roles either.
--
-- Idempotent where Postgres allows it (IF NOT EXISTS / OR REPLACE / DROP …
-- IF EXISTS), so re-running it is harmless. Existing booking requests are kept:
-- only columns are added and the status list is widened.
--
-- Money is stored in pence (integers), currency GBP.

-- ---------------------------------------------------------------------------
-- Clients
-- ---------------------------------------------------------------------------

create table if not exists public.akb_clients (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  full_name text not null check (char_length(btrim(full_name)) between 1 and 100),
  email text not null default '' check (char_length(email) <= 254),
  phone text not null default '' check (char_length(phone) <= 30),
  instagram text not null default '' check (char_length(instagram) <= 60),
  preferred_contact text not null default '' check (preferred_contact in ('', 'email', 'phone', 'instagram')),
  status text not null default 'lead' check (status in ('lead', 'active', 'paused', 'former')),
  notes text not null default '' check (char_length(notes) <= 4000)
);

-- One client per email address: the stable match for returning clients.
create unique index if not exists akb_clients_email_key on public.akb_clients (lower(email)) where email <> '';
create index if not exists akb_clients_status_idx on public.akb_clients (status);
create index if not exists akb_clients_name_idx on public.akb_clients (lower(full_name));

create table if not exists public.akb_client_consents (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  client_id uuid not null references public.akb_clients (id) on delete cascade,
  kind text not null check (kind in ('privacy_notice', 'photos', 'marketing')),
  given_on date not null,
  withdrawn_on date,
  source text not null default '' check (char_length(source) <= 200),
  check (withdrawn_on is null or withdrawn_on >= given_on)
);
create index if not exists akb_client_consents_client_idx on public.akb_client_consents (client_id);

create table if not exists public.akb_follow_ups (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  client_id uuid not null references public.akb_clients (id) on delete cascade,
  due_on date not null,
  note text not null check (char_length(btrim(note)) between 1 and 500),
  done_at timestamptz
);
create index if not exists akb_follow_ups_open_idx on public.akb_follow_ups (due_on) where done_at is null;
create index if not exists akb_follow_ups_client_idx on public.akb_follow_ups (client_id);

-- ---------------------------------------------------------------------------
-- Booking requests: link to a client, more statuses, the decision.
-- ---------------------------------------------------------------------------

alter table public.akb_booking_requests
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists client_id uuid references public.akb_clients (id) on delete set null,
  add column if not exists decided_at timestamptz,
  add column if not exists decision_note text not null default '',
  add column if not exists notified_at timestamptz,
  -- Copied from details by a trigger, so classes can find their requests.
  add column if not exists class_date date,
  add column if not exists class_slot text;

alter table public.akb_booking_requests drop constraint if exists akb_booking_requests_status_check;
alter table public.akb_booking_requests
  add constraint akb_booking_requests_status_check
  check (status in ('new', 'awaiting', 'confirmed', 'declined', 'cancelled', 'completed'));
alter table public.akb_booking_requests drop constraint if exists akb_booking_requests_decision_note_check;
alter table public.akb_booking_requests
  add constraint akb_booking_requests_decision_note_check check (char_length(decision_note) <= 1000);

create index if not exists akb_booking_requests_status_idx on public.akb_booking_requests (status);
create index if not exists akb_booking_requests_client_idx on public.akb_booking_requests (client_id);
create index if not exists akb_booking_requests_class_idx on public.akb_booking_requests (class_date, class_slot);
create index if not exists akb_booking_requests_email_idx on public.akb_booking_requests (lower(email));

-- Exact email match only: anything less certain is left for the coach to decide.
create or replace function public.akb_request_before_insert() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.client_id is null and new.email <> '' then
    select c.id into new.client_id from public.akb_clients c where lower(c.email) = lower(new.email);
  end if;
  if new.details ? 'classDate' and (new.details ->> 'classDate') ~ '^\d{4}-\d{2}-\d{2}$' then
    begin
      new.class_date := (new.details ->> 'classDate')::date;
    exception when others then
      new.class_date := null;
    end;
  end if;
  if new.details ? 'classSlot' then
    new.class_slot := left(new.details ->> 'classSlot', 40);
  end if;
  return new;
end $$;

drop trigger if exists akb_request_before_insert on public.akb_booking_requests;
create trigger akb_request_before_insert before insert on public.akb_booking_requests
  for each row execute function public.akb_request_before_insert();

-- A client added (or given an email) later picks up their earlier requests.
create or replace function public.akb_client_link_requests() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.email <> '' and (tg_op = 'INSERT' or lower(new.email) is distinct from lower(old.email)) then
    update public.akb_booking_requests set client_id = new.id
      where client_id is null and lower(email) = lower(new.email);
  end if;
  return new;
end $$;

drop trigger if exists akb_client_link_requests on public.akb_clients;
create trigger akb_client_link_requests after insert or update of email on public.akb_clients
  for each row execute function public.akb_client_link_requests();

-- ---------------------------------------------------------------------------
-- Activity log: decisions, reschedules, voids and refunds keep their history.
-- ---------------------------------------------------------------------------

create table if not exists public.akb_events (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  client_id uuid references public.akb_clients (id) on delete set null,
  entity text not null check (char_length(entity) <= 40),
  entity_id uuid,
  action text not null check (char_length(action) <= 60),
  detail jsonb not null default '{}'::jsonb
);
create index if not exists akb_events_client_idx on public.akb_events (client_id, created_at desc);
create index if not exists akb_events_entity_idx on public.akb_events (entity_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Group classes: one row per class date (created when first needed), from the
-- timetable in src/content/classes.ts. Capacity is optional.
-- ---------------------------------------------------------------------------

create table if not exists public.akb_class_sessions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  slot text not null check (char_length(slot) between 1 and 40),
  class_date date not null,
  starts_at timestamptz not null,
  duration_minutes integer not null check (duration_minutes between 15 and 240),
  capacity integer check (capacity between 1 and 200),
  notes text not null default '' check (char_length(notes) <= 1000),
  unique (slot, class_date)
);
create index if not exists akb_class_sessions_starts_idx on public.akb_class_sessions (starts_at);

create table if not exists public.akb_class_attendance (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  class_session_id uuid not null references public.akb_class_sessions (id) on delete restrict,
  client_id uuid not null references public.akb_clients (id) on delete restrict,
  request_id uuid references public.akb_booking_requests (id) on delete set null,
  status text not null default 'booked' check (status in ('booked', 'attended', 'cancelled', 'no_show')),
  notes text not null default '' check (char_length(notes) <= 1000),
  -- One place per person per class: no duplicates.
  unique (class_session_id, client_id)
);
create index if not exists akb_class_attendance_client_idx on public.akb_class_attendance (client_id);

-- Capacity, when set, counts booked and attended places.
create or replace function public.akb_attendance_capacity() returns trigger
language plpgsql set search_path = public as $$
declare
  cap integer;
  taken integer;
begin
  if new.status not in ('booked', 'attended') then return new; end if;
  if tg_op = 'UPDATE' and old.status in ('booked', 'attended') and old.class_session_id = new.class_session_id then
    return new;
  end if;
  select capacity into cap from public.akb_class_sessions where id = new.class_session_id for update;
  if cap is null then return new; end if;
  select count(*) into taken from public.akb_class_attendance
    where class_session_id = new.class_session_id and status in ('booked', 'attended') and id <> new.id;
  if taken >= cap then
    raise exception 'akb:class_full' using errcode = 'P0001';
  end if;
  return new;
end $$;

drop trigger if exists akb_attendance_capacity on public.akb_class_attendance;
create trigger akb_attendance_capacity before insert or update of status, class_session_id on public.akb_class_attendance
  for each row execute function public.akb_attendance_capacity();

-- ---------------------------------------------------------------------------
-- One-to-one: packages and sessions.
-- ---------------------------------------------------------------------------

create table if not exists public.akb_packages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  client_id uuid not null references public.akb_clients (id) on delete restrict,
  name text not null check (char_length(btrim(name)) between 1 and 100),
  sessions_total integer not null check (sessions_total between 1 and 100),
  price_pence integer not null check (price_pence between 0 and 1000000),
  purchased_on date not null,
  expires_on date,
  status text not null default 'active' check (status in ('active', 'cancelled')),
  notes text not null default '' check (char_length(notes) <= 1000),
  check (expires_on is null or expires_on >= purchased_on)
);
create index if not exists akb_packages_client_idx on public.akb_packages (client_id);

create table if not exists public.akb_pt_sessions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  client_id uuid not null references public.akb_clients (id) on delete restrict,
  request_id uuid references public.akb_booking_requests (id) on delete set null,
  -- A session uses at most one package place: it can never be deducted twice.
  package_id uuid references public.akb_packages (id) on delete restrict,
  requested text not null default '' check (char_length(requested) <= 300),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  price_pence integer check (price_pence between 0 and 1000000),
  status text not null default 'scheduled' check (status in ('scheduled', 'attended', 'no_show', 'cancelled')),
  notes text not null default '' check (char_length(notes) <= 1000),
  check (ends_at > starts_at and ends_at - starts_at <= interval '8 hours'),
  check (package_id is null or price_pence is null),
  -- Alex can't be in two one-to-one sessions at once.
  constraint akb_pt_sessions_no_overlap exclude using gist (tstzrange(starts_at, ends_at) with &&) where (status <> 'cancelled')
);
create index if not exists akb_pt_sessions_client_idx on public.akb_pt_sessions (client_id);
create index if not exists akb_pt_sessions_starts_idx on public.akb_pt_sessions (starts_at);
create index if not exists akb_pt_sessions_package_idx on public.akb_pt_sessions (package_id);

-- Package places: cancelled sessions give the place back; no-shows use it.
create or replace function public.akb_pt_package_balance() returns trigger
language plpgsql set search_path = public as $$
declare
  pkg record;
  used integer;
begin
  if new.package_id is null or new.status = 'cancelled' then return new; end if;
  select * into pkg from public.akb_packages where id = new.package_id for update;
  if pkg.client_id <> new.client_id then
    raise exception 'akb:package_other_client' using errcode = 'P0001';
  end if;
  if pkg.status <> 'active' then
    raise exception 'akb:package_inactive' using errcode = 'P0001';
  end if;
  select count(*) into used from public.akb_pt_sessions
    where package_id = new.package_id and status <> 'cancelled' and id <> new.id;
  if used >= pkg.sessions_total then
    raise exception 'akb:package_used_up' using errcode = 'P0001';
  end if;
  return new;
end $$;

drop trigger if exists akb_pt_package_balance on public.akb_pt_sessions;
create trigger akb_pt_package_balance before insert or update of package_id, status, client_id on public.akb_pt_sessions
  for each row execute function public.akb_pt_package_balance();

-- ---------------------------------------------------------------------------
-- Online coaching.
-- ---------------------------------------------------------------------------

create table if not exists public.akb_subscriptions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  client_id uuid not null references public.akb_clients (id) on delete restrict,
  plan text not null check (char_length(btrim(plan)) between 1 and 100),
  -- Per month. Expected income only: never counted as received.
  price_pence integer not null check (price_pence between 0 and 1000000),
  start_on date not null,
  end_on date,
  renews_on date,
  status text not null default 'active' check (status in ('active', 'paused', 'cancelled', 'completed')),
  check_in_days integer not null default 7 check (check_in_days between 1 and 90),
  next_check_in_on date,
  notes text not null default '' check (char_length(notes) <= 2000),
  check (end_on is null or end_on >= start_on)
);
create index if not exists akb_subscriptions_client_idx on public.akb_subscriptions (client_id);
create index if not exists akb_subscriptions_status_idx on public.akb_subscriptions (status);

create table if not exists public.akb_check_ins (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  subscription_id uuid not null references public.akb_subscriptions (id) on delete cascade,
  checked_in_on date not null,
  summary text not null check (char_length(btrim(summary)) between 1 and 2000),
  actions text not null default '' check (char_length(actions) <= 2000)
);
create index if not exists akb_check_ins_subscription_idx on public.akb_check_ins (subscription_id, checked_in_on desc);

-- Logging a check-in schedules the next one.
create or replace function public.akb_check_in_schedule() returns trigger
language plpgsql set search_path = public as $$
begin
  update public.akb_subscriptions s
    set next_check_in_on = greatest(coalesce(s.next_check_in_on, new.checked_in_on), new.checked_in_on + s.check_in_days),
        updated_at = now()
    where s.id = new.subscription_id;
  return new;
end $$;

drop trigger if exists akb_check_in_schedule on public.akb_check_ins;
create trigger akb_check_in_schedule after insert on public.akb_check_ins
  for each row execute function public.akb_check_in_schedule();

-- ---------------------------------------------------------------------------
-- Ledger. A charge is money owed; a payment is money received (manual for
-- now; provider columns ready for a payment integration); allocations say
-- which charges a payment paid; refunds give money back.
-- ---------------------------------------------------------------------------

create table if not exists public.akb_charges (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  client_id uuid not null references public.akb_clients (id) on delete restrict,
  service text not null check (service in ('group', 'pt', 'online', 'other')),
  description text not null check (char_length(btrim(description)) between 1 and 200),
  amount_pence integer not null check (amount_pence between 1 and 1000000),
  due_on date not null,
  attendance_id uuid unique references public.akb_class_attendance (id) on delete restrict,
  pt_session_id uuid unique references public.akb_pt_sessions (id) on delete restrict,
  package_id uuid unique references public.akb_packages (id) on delete restrict,
  subscription_id uuid references public.akb_subscriptions (id) on delete restrict,
  period_start date,
  voided_at timestamptz,
  void_reason text not null default '' check (char_length(void_reason) <= 300),
  check (num_nonnulls(attendance_id, pt_session_id, package_id, subscription_id) <= 1),
  check ((subscription_id is null) = (period_start is null)),
  -- One charge per subscription period.
  unique (subscription_id, period_start)
);
create index if not exists akb_charges_client_idx on public.akb_charges (client_id);
create index if not exists akb_charges_due_idx on public.akb_charges (due_on) where voided_at is null;

create table if not exists public.akb_payments (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  client_id uuid not null references public.akb_clients (id) on delete restrict,
  -- Revenue by service is reported on this (cash basis, see ARCHITECTURE.md).
  service text not null check (service in ('group', 'pt', 'online', 'other')),
  amount_pence integer not null check (amount_pence between 1 and 1000000),
  currency text not null default 'GBP' check (currency = 'GBP'),
  paid_on date not null,
  method text not null check (method in ('cash', 'bank_transfer', 'card', 'other')),
  status text not null default 'received' check (status in ('received', 'failed', 'void')),
  status_reason text not null default '' check (char_length(status_reason) <= 300),
  reference text not null default '' check (char_length(reference) <= 200),
  note text not null default '' check (char_length(note) <= 1000),
  -- The same form submitted twice is stored once.
  idempotency_key text not null unique check (char_length(idempotency_key) <= 100),
  -- For a future payment provider: payments it reports are recorded once.
  provider text not null default 'manual' check (char_length(provider) <= 40),
  provider_payment_id text unique check (char_length(provider_payment_id) <= 200)
);
create index if not exists akb_payments_client_idx on public.akb_payments (client_id);
create index if not exists akb_payments_paid_on_idx on public.akb_payments (paid_on);

create table if not exists public.akb_payment_allocations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  payment_id uuid not null references public.akb_payments (id) on delete restrict,
  charge_id uuid not null references public.akb_charges (id) on delete restrict,
  amount_pence integer not null check (amount_pence between 1 and 1000000),
  unique (payment_id, charge_id)
);
create index if not exists akb_payment_allocations_charge_idx on public.akb_payment_allocations (charge_id);

create table if not exists public.akb_refunds (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  payment_id uuid not null references public.akb_payments (id) on delete restrict,
  amount_pence integer not null check (amount_pence between 1 and 1000000),
  refunded_on date not null,
  note text not null default '' check (char_length(note) <= 1000),
  idempotency_key text not null unique check (char_length(idempotency_key) <= 100)
);
create index if not exists akb_refunds_payment_idx on public.akb_refunds (payment_id);
create index if not exists akb_refunds_refunded_on_idx on public.akb_refunds (refunded_on);

-- The ledger rules, checked inside the transaction with the rows locked:
-- a payment can't pay out more than it received (allocations + refunds), a
-- charge can't be paid more than it's for, and both belong to one client.
create or replace function public.akb_allocation_rules() returns trigger
language plpgsql set search_path = public as $$
declare
  pay record;
  chg record;
  pay_used integer;
  chg_paid integer;
begin
  select * into pay from public.akb_payments where id = new.payment_id for update;
  select * into chg from public.akb_charges where id = new.charge_id for update;
  if pay.status <> 'received' then raise exception 'akb:payment_not_received' using errcode = 'P0001'; end if;
  if chg.voided_at is not null then raise exception 'akb:charge_void' using errcode = 'P0001'; end if;
  if pay.client_id <> chg.client_id then raise exception 'akb:other_client' using errcode = 'P0001'; end if;
  select coalesce(sum(amount_pence), 0) into pay_used from public.akb_payment_allocations
    where payment_id = new.payment_id and id <> new.id;
  pay_used := pay_used + (select coalesce(sum(amount_pence), 0) from public.akb_refunds where payment_id = new.payment_id);
  if pay_used + new.amount_pence > pay.amount_pence then
    raise exception 'akb:payment_overallocated' using errcode = 'P0001';
  end if;
  select coalesce(sum(amount_pence), 0) into chg_paid from public.akb_payment_allocations
    where charge_id = new.charge_id and id <> new.id;
  if chg_paid + new.amount_pence > chg.amount_pence then
    raise exception 'akb:charge_overpaid' using errcode = 'P0001';
  end if;
  return new;
end $$;

drop trigger if exists akb_allocation_rules on public.akb_payment_allocations;
create trigger akb_allocation_rules before insert or update on public.akb_payment_allocations
  for each row execute function public.akb_allocation_rules();

create or replace function public.akb_refund_rules() returns trigger
language plpgsql set search_path = public as $$
declare
  pay record;
  used integer;
begin
  select * into pay from public.akb_payments where id = new.payment_id for update;
  if pay.status <> 'received' then raise exception 'akb:payment_not_received' using errcode = 'P0001'; end if;
  if new.refunded_on < pay.paid_on then raise exception 'akb:refund_before_payment' using errcode = 'P0001'; end if;
  select coalesce(sum(amount_pence), 0) into used from public.akb_payment_allocations where payment_id = new.payment_id;
  used := used + (select coalesce(sum(amount_pence), 0) from public.akb_refunds where payment_id = new.payment_id and id <> new.id);
  if used + new.amount_pence > pay.amount_pence then
    raise exception 'akb:refund_too_large' using errcode = 'P0001';
  end if;
  return new;
end $$;

drop trigger if exists akb_refund_rules on public.akb_refunds;
create trigger akb_refund_rules before insert or update on public.akb_refunds
  for each row execute function public.akb_refund_rules();

-- Financial history is kept: payments and refunds are never edited in place
-- except for their status, and never deleted.
create or replace function public.akb_payments_immutable() returns trigger
language plpgsql set search_path = public as $$
begin
  if tg_op = 'DELETE' then raise exception 'akb:ledger_immutable' using errcode = 'P0001'; end if;
  if (new.client_id, new.service, new.amount_pence, new.currency, new.paid_on, new.method, new.idempotency_key)
     is distinct from (old.client_id, old.service, old.amount_pence, old.currency, old.paid_on, old.method, old.idempotency_key) then
    raise exception 'akb:ledger_immutable' using errcode = 'P0001';
  end if;
  return new;
end $$;

drop trigger if exists akb_payments_immutable on public.akb_payments;
create trigger akb_payments_immutable before update or delete on public.akb_payments
  for each row execute function public.akb_payments_immutable();

create or replace function public.akb_refunds_immutable() returns trigger
language plpgsql set search_path = public as $$
begin
  raise exception 'akb:ledger_immutable' using errcode = 'P0001';
end $$;

drop trigger if exists akb_refunds_immutable on public.akb_refunds;
create trigger akb_refunds_immutable before update or delete on public.akb_refunds
  for each row execute function public.akb_refunds_immutable();

-- ---------------------------------------------------------------------------
-- Views (security_invoker: they read with the caller's rights, so they are as
-- closed as the tables).
-- ---------------------------------------------------------------------------

create or replace view public.akb_charge_balances with (security_invoker = true) as
  select c.*,
    coalesce((select sum(a.amount_pence) from public.akb_payment_allocations a where a.charge_id = c.id), 0)::integer as paid_pence,
    case when c.voided_at is null
      then c.amount_pence - coalesce((select sum(a.amount_pence) from public.akb_payment_allocations a where a.charge_id = c.id), 0)
      else 0 end::integer as outstanding_pence
  from public.akb_charges c;

create or replace view public.akb_payment_balances with (security_invoker = true) as
  select p.*,
    coalesce((select sum(a.amount_pence) from public.akb_payment_allocations a where a.payment_id = p.id), 0)::integer as allocated_pence,
    coalesce((select sum(r.amount_pence) from public.akb_refunds r where r.payment_id = p.id), 0)::integer as refunded_pence,
    case when p.status = 'received' then
      p.amount_pence
      - coalesce((select sum(a.amount_pence) from public.akb_payment_allocations a where a.payment_id = p.id), 0)
      - coalesce((select sum(r.amount_pence) from public.akb_refunds r where r.payment_id = p.id), 0)
    else 0 end::integer as unallocated_pence
  from public.akb_payments p;

create or replace view public.akb_package_balances with (security_invoker = true) as
  select k.*,
    (select count(*) from public.akb_pt_sessions s where s.package_id = k.id and s.status <> 'cancelled')::integer as sessions_used,
    (select count(*) from public.akb_pt_sessions s where s.package_id = k.id and s.status = 'attended')::integer as sessions_delivered,
    (k.sessions_total - (select count(*) from public.akb_pt_sessions s where s.package_id = k.id and s.status <> 'cancelled'))::integer as sessions_remaining
  from public.akb_packages k;

-- Received is net of refunds; outstanding counts charges already due; credit
-- is money received but not yet set against a charge.
create or replace view public.akb_client_balances with (security_invoker = true) as
  select cl.id as client_id,
    coalesce((select sum(p.amount_pence) from public.akb_payments p where p.client_id = cl.id and p.status = 'received'), 0)::integer
      - coalesce((select sum(r.amount_pence) from public.akb_refunds r join public.akb_payments p on p.id = r.payment_id
                  where p.client_id = cl.id and p.status = 'received'), 0)::integer as received_pence,
    coalesce((select sum(b.outstanding_pence) from public.akb_charge_balances b
              where b.client_id = cl.id and b.due_on <= (now() at time zone 'Europe/London')::date), 0)::integer as outstanding_pence,
    coalesce((select sum(b.outstanding_pence) from public.akb_charge_balances b
              where b.client_id = cl.id and b.due_on > (now() at time zone 'Europe/London')::date), 0)::integer as due_later_pence,
    coalesce((select sum(pb.unallocated_pence) from public.akb_payment_balances pb where pb.client_id = cl.id), 0)::integer as credit_pence
  from public.akb_clients cl;

-- Class dates with their headcount.
create or replace view public.akb_class_overview with (security_invoker = true) as
  select s.*,
    (select count(*) from public.akb_class_attendance a where a.class_session_id = s.id and a.status in ('booked', 'attended'))::integer as booked,
    (select count(*) from public.akb_class_attendance a where a.class_session_id = s.id and a.status = 'attended')::integer as attended
  from public.akb_class_sessions s;

-- ---------------------------------------------------------------------------
-- Operations that must happen together (one transaction each).
-- ---------------------------------------------------------------------------

-- The class row for a timetable date, created on first use.
create or replace function public.akb_ensure_class_session(p_slot text, p_date date, p_starts_at timestamptz, p_duration integer)
returns uuid language plpgsql set search_path = public as $$
declare
  sid uuid;
begin
  insert into public.akb_class_sessions (slot, class_date, starts_at, duration_minutes)
    values (p_slot, p_date, p_starts_at, p_duration)
    on conflict (slot, class_date) do nothing;
  select id into sid from public.akb_class_sessions where slot = p_slot and class_date = p_date;
  return sid;
end $$;

-- Adds someone to a class (and charges them, if a price is given).
create or replace function public.akb_add_attendee(
  p_client uuid, p_slot text, p_date date, p_starts_at timestamptz, p_duration integer,
  p_price_pence integer, p_description text, p_request uuid default null
) returns uuid language plpgsql set search_path = public as $$
declare
  sid uuid;
  aid uuid;
begin
  sid := public.akb_ensure_class_session(p_slot, p_date, p_starts_at, p_duration);
  insert into public.akb_class_attendance (class_session_id, client_id, request_id)
    values (sid, p_client, p_request) returning id into aid;
  if coalesce(p_price_pence, 0) > 0 then
    insert into public.akb_charges (client_id, service, description, amount_pence, due_on, attendance_id)
      values (p_client, 'group', p_description, p_price_pence, p_date, aid);
  end if;
  insert into public.akb_events (client_id, entity, entity_id, action, detail)
    values (p_client, 'attendance', aid, 'booked', jsonb_build_object('class_date', p_date, 'slot', p_slot));
  return aid;
end $$;

-- Books a one-to-one session (charged at its price unless it uses a package).
create or replace function public.akb_add_pt_session(
  p_client uuid, p_starts_at timestamptz, p_ends_at timestamptz, p_price_pence integer,
  p_package uuid, p_requested text, p_notes text, p_description text, p_request uuid default null
) returns uuid language plpgsql set search_path = public as $$
declare
  ptid uuid;
begin
  insert into public.akb_pt_sessions (client_id, request_id, package_id, requested, starts_at, ends_at, price_pence, notes)
    values (p_client, p_request, p_package, coalesce(p_requested, ''), p_starts_at, p_ends_at,
            case when p_package is null then p_price_pence else null end, coalesce(p_notes, ''))
    returning id into ptid;
  if p_package is null and coalesce(p_price_pence, 0) > 0 then
    insert into public.akb_charges (client_id, service, description, amount_pence, due_on, pt_session_id)
      values (p_client, 'pt', p_description, p_price_pence, (p_starts_at at time zone 'Europe/London')::date, ptid);
  end if;
  insert into public.akb_events (client_id, entity, entity_id, action, detail)
    values (p_client, 'pt_session', ptid, 'booked', jsonb_build_object('starts_at', p_starts_at, 'package', p_package));
  return ptid;
end $$;

-- Confirms a booking request: picks or creates the client, books the class
-- place or one-to-one session, and marks the request confirmed, all or nothing.
-- p_booking: {"kind":"class","slot","date","starts_at","duration","price_pence","description"}
--         or {"kind":"pt","starts_at","ends_at","price_pence","package_id","description"}
--         or {"kind":"none"}.
create or replace function public.akb_confirm_request(
  p_request uuid, p_client uuid, p_new_client jsonb, p_booking jsonb, p_note text
) returns jsonb language plpgsql set search_path = public as $$
declare
  req record;
  cid uuid;
  booked uuid;
begin
  select * into req from public.akb_booking_requests where id = p_request for update;
  if not found then raise exception 'akb:not_found' using errcode = 'P0001'; end if;
  if req.status not in ('new', 'awaiting') then raise exception 'akb:already_decided' using errcode = 'P0001'; end if;

  if p_client is not null then
    select id into cid from public.akb_clients where id = p_client;
    if cid is null then raise exception 'akb:not_found' using errcode = 'P0001'; end if;
  else
    insert into public.akb_clients (full_name, email, phone, status)
      values (p_new_client ->> 'full_name', coalesce(p_new_client ->> 'email', ''), coalesce(p_new_client ->> 'phone', ''), 'active')
      returning id into cid;
    insert into public.akb_client_consents (client_id, kind, given_on, source)
      values (cid, 'privacy_notice', (req.created_at at time zone 'Europe/London')::date, 'Booking request on the website');
  end if;
  update public.akb_clients set status = 'active', updated_at = now() where id = cid and status in ('lead', 'former', 'paused');

  if p_booking ->> 'kind' = 'class' then
    booked := public.akb_add_attendee(cid, p_booking ->> 'slot', (p_booking ->> 'date')::date,
      (p_booking ->> 'starts_at')::timestamptz, (p_booking ->> 'duration')::integer,
      (p_booking ->> 'price_pence')::integer, p_booking ->> 'description', p_request);
  elsif p_booking ->> 'kind' = 'pt' then
    booked := public.akb_add_pt_session(cid, (p_booking ->> 'starts_at')::timestamptz, (p_booking ->> 'ends_at')::timestamptz,
      (p_booking ->> 'price_pence')::integer, nullif(p_booking ->> 'package_id', '')::uuid, req.summary, '',
      p_booking ->> 'description', p_request);
  end if;

  update public.akb_booking_requests
    set status = 'confirmed', client_id = cid, decided_at = now(), decision_note = coalesce(p_note, ''), updated_at = now()
    where id = p_request;
  insert into public.akb_events (client_id, entity, entity_id, action, detail)
    values (cid, 'request', p_request, 'confirmed', jsonb_build_object('booking', p_booking ->> 'kind', 'note', coalesce(p_note, '')));
  return jsonb_build_object('client_id', cid, 'booked_id', booked);
end $$;

-- Records a payment and sets it against charges, oldest first, all or nothing.
-- p_allocations: [{"charge_id": "...", "amount_pence": 1000}, ...]
create or replace function public.akb_record_payment(
  p_client uuid, p_service text, p_amount_pence integer, p_paid_on date, p_method text,
  p_reference text, p_note text, p_key text, p_allocations jsonb
) returns uuid language plpgsql set search_path = public as $$
declare
  pid uuid;
  alloc jsonb;
begin
  insert into public.akb_payments (client_id, service, amount_pence, paid_on, method, reference, note, idempotency_key)
    values (p_client, p_service, p_amount_pence, p_paid_on, p_method, coalesce(p_reference, ''), coalesce(p_note, ''), p_key)
    on conflict (idempotency_key) do nothing
    returning id into pid;
  if pid is null then
    -- Already recorded by an identical earlier submission.
    select id into pid from public.akb_payments where idempotency_key = p_key;
    return pid;
  end if;
  for alloc in select * from jsonb_array_elements(coalesce(p_allocations, '[]'::jsonb)) loop
    insert into public.akb_payment_allocations (payment_id, charge_id, amount_pence)
      values (pid, (alloc ->> 'charge_id')::uuid, (alloc ->> 'amount_pence')::integer);
  end loop;
  insert into public.akb_events (client_id, entity, entity_id, action, detail)
    values (p_client, 'payment', pid, 'recorded', jsonb_build_object('amount_pence', p_amount_pence, 'method', p_method));
  return pid;
end $$;

-- Sets a payment's unallocated money against one charge.
create or replace function public.akb_allocate_payment(p_payment uuid, p_charge uuid, p_amount_pence integer)
returns void language plpgsql set search_path = public as $$
begin
  insert into public.akb_payment_allocations (payment_id, charge_id, amount_pence)
    values (p_payment, p_charge, p_amount_pence)
    on conflict (payment_id, charge_id) do update
      set amount_pence = public.akb_payment_allocations.amount_pence + excluded.amount_pence;
  insert into public.akb_events (client_id, entity, entity_id, action, detail)
    select client_id, 'payment', p_payment, 'allocated', jsonb_build_object('charge_id', p_charge, 'amount_pence', p_amount_pence)
    from public.akb_payments where id = p_payment;
end $$;

-- A refund comes out of the payment's unallocated money first; anything more
-- is taken back from its allocation to p_charge (which is then owed again,
-- unless p_void_charge cancels that charge).
create or replace function public.akb_record_refund(
  p_payment uuid, p_amount_pence integer, p_refunded_on date, p_note text, p_key text,
  p_charge uuid, p_void_charge boolean
) returns uuid language plpgsql set search_path = public as $$
declare
  pay record;
  free integer;
  take integer;
  alloc_amount integer;
  rid uuid;
begin
  select id into rid from public.akb_refunds where idempotency_key = p_key;
  if rid is not null then return rid; end if;
  -- Lock first, then read the balance, so two refunds can't both see the same money.
  perform 1 from public.akb_payments where id = p_payment for update;
  if not found then raise exception 'akb:not_found' using errcode = 'P0001'; end if;
  select * into pay from public.akb_payment_balances where id = p_payment;
  if pay.status <> 'received' then raise exception 'akb:payment_not_received' using errcode = 'P0001'; end if;
  free := pay.unallocated_pence;
  take := greatest(p_amount_pence - free, 0);
  if take > 0 then
    if p_charge is null then raise exception 'akb:refund_needs_charge' using errcode = 'P0001'; end if;
    select amount_pence into alloc_amount from public.akb_payment_allocations
      where payment_id = p_payment and charge_id = p_charge for update;
    if alloc_amount is null or alloc_amount < take then raise exception 'akb:refund_too_large' using errcode = 'P0001'; end if;
    if alloc_amount = take then
      delete from public.akb_payment_allocations where payment_id = p_payment and charge_id = p_charge;
    else
      update public.akb_payment_allocations set amount_pence = amount_pence - take where payment_id = p_payment and charge_id = p_charge;
    end if;
  end if;
  insert into public.akb_refunds (payment_id, amount_pence, refunded_on, note, idempotency_key)
    values (p_payment, p_amount_pence, p_refunded_on, coalesce(p_note, ''), p_key) returning id into rid;
  if p_charge is not null and p_void_charge then
    perform public.akb_void_charge(p_charge, 'Refunded');
  end if;
  insert into public.akb_events (client_id, entity, entity_id, action, detail)
    values (pay.client_id, 'payment', p_payment, 'refunded',
            jsonb_build_object('amount_pence', p_amount_pence, 'refunded_on', p_refunded_on, 'charge_id', p_charge));
  return rid;
end $$;

-- Cancels a charge. Money already set against it goes back to the client's
-- credit (the allocations are logged, then removed).
create or replace function public.akb_void_charge(p_charge uuid, p_reason text)
returns void language plpgsql set search_path = public as $$
declare
  chg record;
  moved jsonb;
begin
  select * into chg from public.akb_charges where id = p_charge for update;
  if not found then raise exception 'akb:not_found' using errcode = 'P0001'; end if;
  if chg.voided_at is not null then return; end if;
  select coalesce(jsonb_agg(jsonb_build_object('payment_id', payment_id, 'amount_pence', amount_pence)), '[]'::jsonb)
    into moved from public.akb_payment_allocations where charge_id = p_charge;
  delete from public.akb_payment_allocations where charge_id = p_charge;
  update public.akb_charges set voided_at = now(), void_reason = left(coalesce(p_reason, ''), 300) where id = p_charge;
  insert into public.akb_events (client_id, entity, entity_id, action, detail)
    values (chg.client_id, 'charge', p_charge, 'voided', jsonb_build_object('reason', coalesce(p_reason, ''), 'released', moved));
end $$;

-- Marks a payment failed (e.g. a bounced transfer) or void (entered in
-- error). Its allocations are logged and removed, so the charges are owed again.
create or replace function public.akb_set_payment_status(p_payment uuid, p_status text, p_reason text)
returns void language plpgsql set search_path = public as $$
declare
  pay record;
  moved jsonb;
begin
  if p_status not in ('failed', 'void') then raise exception 'akb:invalid_status' using errcode = 'P0001'; end if;
  select * into pay from public.akb_payments where id = p_payment for update;
  if not found then raise exception 'akb:not_found' using errcode = 'P0001'; end if;
  if pay.status <> 'received' then raise exception 'akb:already_decided' using errcode = 'P0001'; end if;
  if exists (select 1 from public.akb_refunds where payment_id = p_payment) then
    raise exception 'akb:payment_has_refunds' using errcode = 'P0001';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('charge_id', charge_id, 'amount_pence', amount_pence)), '[]'::jsonb)
    into moved from public.akb_payment_allocations where payment_id = p_payment;
  delete from public.akb_payment_allocations where payment_id = p_payment;
  update public.akb_payments set status = p_status, status_reason = left(coalesce(p_reason, ''), 300) where id = p_payment;
  insert into public.akb_events (client_id, entity, entity_id, action, detail)
    values (pay.client_id, 'payment', p_payment, p_status, jsonb_build_object('reason', coalesce(p_reason, ''), 'released', moved));
end $$;

-- Moves a one-to-one session, keeping the old time in the log.
create or replace function public.akb_reschedule_pt_session(p_session uuid, p_starts_at timestamptz, p_ends_at timestamptz)
returns void language plpgsql set search_path = public as $$
declare
  s record;
begin
  select * into s from public.akb_pt_sessions where id = p_session for update;
  if not found then raise exception 'akb:not_found' using errcode = 'P0001'; end if;
  if s.status <> 'scheduled' then raise exception 'akb:not_scheduled' using errcode = 'P0001'; end if;
  update public.akb_pt_sessions set starts_at = p_starts_at, ends_at = p_ends_at, updated_at = now() where id = p_session;
  update public.akb_charges set due_on = (p_starts_at at time zone 'Europe/London')::date
    where pt_session_id = p_session and voided_at is null;
  insert into public.akb_events (client_id, entity, entity_id, action, detail)
    values (s.client_id, 'pt_session', p_session, 'rescheduled',
            jsonb_build_object('from', s.starts_at, 'to', p_starts_at));
end $$;

-- Session and attendance outcomes. Cancelling also cancels an unpaid charge
-- (a paid one is left for the coach to refund or keep as credit).
create or replace function public.akb_set_pt_status(p_session uuid, p_status text, p_reason text)
returns void language plpgsql set search_path = public as $$
declare
  s record;
  chg uuid;
begin
  if p_status not in ('scheduled', 'attended', 'no_show', 'cancelled') then
    raise exception 'akb:invalid_status' using errcode = 'P0001';
  end if;
  select * into s from public.akb_pt_sessions where id = p_session for update;
  if not found then raise exception 'akb:not_found' using errcode = 'P0001'; end if;
  if s.status = p_status then return; end if;
  update public.akb_pt_sessions set status = p_status, updated_at = now() where id = p_session;
  if p_status = 'cancelled' then
    select c.id into chg from public.akb_charges c
      where c.pt_session_id = p_session and c.voided_at is null
        and not exists (select 1 from public.akb_payment_allocations a where a.charge_id = c.id);
    if chg is not null then perform public.akb_void_charge(chg, 'Session cancelled'); end if;
  end if;
  insert into public.akb_events (client_id, entity, entity_id, action, detail)
    values (s.client_id, 'pt_session', p_session, p_status, jsonb_build_object('from', s.status, 'reason', coalesce(p_reason, '')));
end $$;

create or replace function public.akb_set_attendance(p_attendance uuid, p_status text)
returns void language plpgsql set search_path = public as $$
declare
  a record;
  chg uuid;
begin
  if p_status not in ('booked', 'attended', 'cancelled', 'no_show') then
    raise exception 'akb:invalid_status' using errcode = 'P0001';
  end if;
  select * into a from public.akb_class_attendance where id = p_attendance for update;
  if not found then raise exception 'akb:not_found' using errcode = 'P0001'; end if;
  if a.status = p_status then return; end if;
  update public.akb_class_attendance set status = p_status, updated_at = now() where id = p_attendance;
  if p_status = 'cancelled' then
    select c.id into chg from public.akb_charges c
      where c.attendance_id = p_attendance and c.voided_at is null
        and not exists (select 1 from public.akb_payment_allocations x where x.charge_id = c.id);
    if chg is not null then perform public.akb_void_charge(chg, 'Place cancelled'); end if;
  end if;
  insert into public.akb_events (client_id, entity, entity_id, action, detail)
    values (a.client_id, 'attendance', p_attendance, p_status, jsonb_build_object('from', a.status));
end $$;

-- Sells a package and raises its charge together.
create or replace function public.akb_add_package(
  p_client uuid, p_name text, p_sessions integer, p_price_pence integer, p_purchased_on date, p_expires_on date, p_notes text
) returns uuid language plpgsql set search_path = public as $$
declare
  kid uuid;
begin
  insert into public.akb_packages (client_id, name, sessions_total, price_pence, purchased_on, expires_on, notes)
    values (p_client, p_name, p_sessions, p_price_pence, p_purchased_on, p_expires_on, coalesce(p_notes, ''))
    returning id into kid;
  if p_price_pence > 0 then
    insert into public.akb_charges (client_id, service, description, amount_pence, due_on, package_id)
      values (p_client, 'pt', p_name, p_price_pence, p_purchased_on, kid);
  end if;
  insert into public.akb_events (client_id, entity, entity_id, action, detail)
    values (p_client, 'package', kid, 'sold', jsonb_build_object('sessions', p_sessions, 'price_pence', p_price_pence));
  return kid;
end $$;

-- Raises the charge for the subscription's current period and moves the
-- renewal date on a month. The unique (subscription, period) key stops the
-- same month being charged twice.
create or replace function public.akb_charge_subscription_period(p_subscription uuid)
returns uuid language plpgsql set search_path = public as $$
declare
  s record;
  period date;
  cid uuid;
begin
  select * into s from public.akb_subscriptions where id = p_subscription for update;
  if not found then raise exception 'akb:not_found' using errcode = 'P0001'; end if;
  if s.status <> 'active' then raise exception 'akb:subscription_inactive' using errcode = 'P0001'; end if;
  if s.price_pence <= 0 then raise exception 'akb:no_price' using errcode = 'P0001'; end if;
  period := coalesce(s.renews_on, s.start_on);
  if s.end_on is not null and period > s.end_on then raise exception 'akb:subscription_ended' using errcode = 'P0001'; end if;
  insert into public.akb_charges (client_id, service, description, amount_pence, due_on, subscription_id, period_start)
    values (s.client_id, 'online', s.plan || ' from ' || to_char(period, 'FMDD Mon YYYY'), s.price_pence, period, s.id, period)
    returning id into cid;
  update public.akb_subscriptions set renews_on = (period + interval '1 month')::date, updated_at = now() where id = s.id;
  insert into public.akb_events (client_id, entity, entity_id, action, detail)
    values (s.client_id, 'subscription', s.id, 'charged', jsonb_build_object('period_start', period, 'amount_pence', s.price_pence));
  return cid;
end $$;

-- ---------------------------------------------------------------------------
-- Access: server only.
-- ---------------------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array[
    'akb_clients', 'akb_client_consents', 'akb_follow_ups', 'akb_events', 'akb_class_sessions',
    'akb_class_attendance', 'akb_packages', 'akb_pt_sessions', 'akb_subscriptions', 'akb_check_ins',
    'akb_charges', 'akb_payments', 'akb_payment_allocations', 'akb_refunds'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
  foreach t in array array[
    'akb_charge_balances', 'akb_payment_balances', 'akb_package_balances', 'akb_client_balances', 'akb_class_overview'
  ] loop
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end $$;

do $$
declare
  f record;
begin
  for f in
    select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname like 'akb\_%'
  loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
    execute format('grant execute on function %s to service_role', f.sig);
  end loop;
end $$;

-- PostgREST picks up the new tables and functions.
notify pgrst, 'reload schema';
