-- Square card payments for the coach portal (ARCHITECTURE.md → Square payments).
--
-- Flow: the coach creates a Square payment link (Square Checkout API, hosted by
-- Square) for a charge's outstanding amount and sends it to the client. Square
-- tells the site by signed webhook; the site re-reads the payment from Square's
-- API and only then records it here, once, against that charge. Refunds are made
-- in the Square Dashboard and mirrored the same way. Nothing a browser sends or
-- a redirect shows ever records a payment.
--
-- Run after 20261020000000_akb_payment_functions.sql. Adds a database-role
-- marker (Sandbox records are refused unless the database is marked 'test'),
-- two tables, and
-- replaces akb_record_refund, akb_set_payment_status and akb_void_charge with
-- versions that keep Square-managed payments in step with Square. Creates,
-- changes or deletes no existing rows. One transaction; safe to run again.

begin;

-- ---------------------------------------------------------------------------
-- Which kind of database this is, so Sandbox (test) money can never enter the
-- live ledger and live money can never land in a test database.
--
-- No row (the default, and what production keeps) = 'production': Sandbox
-- payment links, events and payments are refused. A test database is marked
-- once, by its owner, in the SQL Editor (never by a migration or the app):
--   insert into public.akb_database_role (role) values ('test');
-- The site's server role can read the marker but not change it.
-- ---------------------------------------------------------------------------

create table if not exists public.akb_database_role (
  only_row boolean primary key default true check (only_row),
  role text not null check (role in ('production', 'test')),
  set_at timestamptz not null default now()
);
alter table public.akb_database_role enable row level security;
revoke all on public.akb_database_role from public, anon, authenticated, service_role;
grant select on public.akb_database_role to service_role;
-- RLS on with no policies: anon/authenticated get nothing; service_role (which bypasses RLS) may only read.

create or replace function public.akb_database_role() returns text
language sql stable set search_path = public as $$
  select coalesce((select role from public.akb_database_role where only_row), 'production');
$$;

-- Refuses a Square record whose environment doesn't match the database.
create or replace function public.akb_square_environment_guard() returns trigger
language plpgsql set search_path = public as $$
declare
  env text;
begin
  if tg_table_name = 'akb_payments' then
    env := case new.provider when 'square_sandbox' then 'sandbox' when 'square' then 'production' else null end;
  else
    env := new.environment;
  end if;
  if env = 'sandbox' and public.akb_database_role() <> 'test' then
    raise exception 'akb:sandbox_in_production' using errcode = 'P0001';
  end if;
  if env = 'production' and public.akb_database_role() <> 'production' then
    raise exception 'akb:live_in_test' using errcode = 'P0001';
  end if;
  return new;
end $$;

create or replace trigger akb_payments_square_environment before insert or update of provider on public.akb_payments
  for each row execute function public.akb_square_environment_guard();

-- One Square payment link per attempt to collect a charge. At most one link
-- per charge is live (creating/open) at a time.
create table if not exists public.akb_square_payment_links (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  environment text not null check (environment in ('sandbox', 'production')),
  charge_id uuid not null references public.akb_charges (id) on delete restrict,
  client_id uuid not null references public.akb_clients (id) on delete restrict,
  amount_pence integer not null check (amount_pence between 1 and 1000000),
  -- Sent to Square as the CreatePaymentLink idempotency key, so a retried
  -- create never makes a second link.
  idempotency_key uuid not null unique default gen_random_uuid(),
  square_link_id text unique check (char_length(square_link_id) <= 100),
  square_order_id text unique check (char_length(square_order_id) <= 100),
  url text not null default '' check (char_length(url) <= 500),
  status text not null default 'creating' check (status in ('creating', 'open', 'paid', 'cancelled')),
  paid_payment_id uuid references public.akb_payments (id) on delete restrict,
  check (status <> 'open' or (square_link_id is not null and square_order_id is not null and url <> ''))
);
create unique index if not exists akb_square_payment_links_one_live
  on public.akb_square_payment_links (charge_id) where status in ('creating', 'open');
create index if not exists akb_square_payment_links_client_idx on public.akb_square_payment_links (client_id);

-- Every webhook event received, by Square's event_id: a repeat delivery is
-- recognised and not processed twice. Only ids, types and outcomes are kept;
-- no payment card or personal data.
create table if not exists public.akb_square_events (
  event_id text primary key check (char_length(event_id) between 1 and 100),
  received_at timestamptz not null default now(),
  environment text not null check (environment in ('sandbox', 'production')),
  type text not null check (char_length(type) <= 60),
  object_id text not null default '' check (char_length(object_id) <= 100),
  attempts integer not null default 1 check (attempts between 1 and 1000),
  processed_at timestamptz,
  outcome text not null default '' check (char_length(outcome) <= 60)
);
create index if not exists akb_square_events_unprocessed_idx on public.akb_square_events (received_at) where processed_at is null;

create or replace trigger akb_square_payment_links_environment before insert or update of environment on public.akb_square_payment_links
  for each row execute function public.akb_square_environment_guard();
create or replace trigger akb_square_events_environment before insert or update of environment on public.akb_square_events
  for each row execute function public.akb_square_environment_guard();

-- Square payments are recorded with provider 'square' (live) or
-- 'square_sandbox' (test), so test money is always distinguishable.
create or replace function public.akb_square_provider(p_environment text) returns text
language plpgsql immutable set search_path = public as $$
begin
  if p_environment = 'production' then return 'square'; end if;
  if p_environment = 'sandbox' then return 'square_sandbox'; end if;
  raise exception 'akb:invalid_environment' using errcode = 'P0001';
end $$;

-- ---------------------------------------------------------------------------
-- Refunds: one implementation; the portal's entry point refuses payments a
-- provider manages (a refund recorded here wouldn't return money in Square).
-- ---------------------------------------------------------------------------

create or replace function public.akb_refund_apply(
  p_payment uuid, p_amount_pence integer, p_refunded_on date, p_note text, p_key text,
  p_charge uuid, p_void_charge boolean, p_allow_provider boolean
) returns uuid language plpgsql set search_path = public as $$
declare
  pay record;
  free integer;
  take integer;
  alloc_amount integer;
  rid uuid;
begin
  -- Lock first, then read the key and balance, so two refunds can't both see the same money.
  perform 1 from public.akb_payments where id = p_payment for update;
  if not found then raise exception 'akb:not_found' using errcode = 'P0001'; end if;
  select id into rid from public.akb_refunds where idempotency_key = p_key;
  if rid is not null then return rid; end if;
  select * into pay from public.akb_payment_balances where id = p_payment;
  if pay.provider <> 'manual' and not p_allow_provider then raise exception 'akb:provider_managed' using errcode = 'P0001'; end if;
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
            jsonb_build_object('amount_pence', p_amount_pence, 'refunded_on', p_refunded_on, 'charge_id', p_charge, 'provider', pay.provider));
  return rid;
end $$;

-- The portal's refund (cash and bank transfer payments only).
create or replace function public.akb_record_refund(
  p_payment uuid, p_amount_pence integer, p_refunded_on date, p_note text, p_key text,
  p_charge uuid, p_void_charge boolean
) returns uuid language plpgsql set search_path = public as $$
begin
  return public.akb_refund_apply(p_payment, p_amount_pence, p_refunded_on, p_note, p_key, p_charge, p_void_charge, false);
end $$;

-- Failed/void is for manual payments entered in error or bounced. A Square
-- payment's state is Square's: a COMPLETED card payment can only be refunded.
create or replace function public.akb_set_payment_status(p_payment uuid, p_status text, p_reason text)
returns void language plpgsql set search_path = public as $$
declare
  pay record;
  moved jsonb;
begin
  if p_status not in ('failed', 'void') then raise exception 'akb:invalid_status' using errcode = 'P0001'; end if;
  select * into pay from public.akb_payments where id = p_payment for update;
  if not found then raise exception 'akb:not_found' using errcode = 'P0001'; end if;
  if pay.provider <> 'manual' then raise exception 'akb:provider_managed' using errcode = 'P0001'; end if;
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

-- Cancels a charge (as before) and retires its live Square link, so the
-- portal stops offering it. A payment that still arrives through the old link
-- is recorded and becomes the client's credit.
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
  update public.akb_square_payment_links set status = 'cancelled' where charge_id = p_charge and status in ('creating', 'open');
  insert into public.akb_events (client_id, entity, entity_id, action, detail)
    values (chg.client_id, 'charge', p_charge, 'voided', jsonb_build_object('reason', coalesce(p_reason, ''), 'released', moved));
end $$;

-- ---------------------------------------------------------------------------
-- Applying Square's state. Called by the webhook handler and the reconciler
-- only after re-reading the payment/refund from Square's API. Idempotent: the
-- same Square payment or refund is recorded at most once.
-- Returns: recorded | duplicate | unknown_order | unknown_payment | pending |
--          not_paid | not_refunded
-- ---------------------------------------------------------------------------

create or replace function public.akb_apply_square_payment(
  p_environment text, p_payment_id text, p_order_id text, p_status text,
  p_amount_pence integer, p_currency text, p_paid_on date
) returns text language plpgsql set search_path = public as $$
declare
  provider_name text := public.akb_square_provider(p_environment);
  link record;
  chg record;
  pid uuid;
  owed integer;
begin
  select * into link from public.akb_square_payment_links
    where square_order_id = p_order_id and environment = p_environment for update;
  -- Not one of our links (e.g. an in-person Square sale): ignored.
  if not found then return 'unknown_order'; end if;
  if p_status in ('FAILED', 'CANCELED') then return 'not_paid'; end if;
  if p_status <> 'COMPLETED' then return 'pending'; end if;
  if p_currency is distinct from 'GBP' then raise exception 'akb:currency_mismatch' using errcode = 'P0001'; end if;
  select id into pid from public.akb_payments where provider = provider_name and provider_payment_id = p_payment_id;
  if pid is not null then return 'duplicate'; end if;

  select * into chg from public.akb_charges where id = link.charge_id for update;
  insert into public.akb_payments (client_id, service, amount_pence, paid_on, method, reference, note, idempotency_key, provider, provider_payment_id)
    values (link.client_id, chg.service, p_amount_pence, p_paid_on, 'card', left(p_payment_id, 200), 'Square payment link',
            left(provider_name || ':' || p_payment_id, 100), provider_name, p_payment_id)
    returning id into pid;
  -- Pays what's still owed on the charge; anything more (or a cancelled charge) is credit.
  if chg.voided_at is null then
    select chg.amount_pence - coalesce(sum(amount_pence), 0) into owed from public.akb_payment_allocations where charge_id = chg.id;
    if least(owed, p_amount_pence) > 0 then
      insert into public.akb_payment_allocations (payment_id, charge_id, amount_pence) values (pid, chg.id, least(owed, p_amount_pence));
    end if;
  end if;
  update public.akb_square_payment_links set status = 'paid', paid_payment_id = coalesce(paid_payment_id, pid) where id = link.id;
  insert into public.akb_events (client_id, entity, entity_id, action, detail)
    values (link.client_id, 'payment', pid, 'recorded',
            jsonb_build_object('amount_pence', p_amount_pence, 'method', 'card', 'provider', provider_name, 'charge_id', chg.id, 'square_payment_id', p_payment_id));
  return 'recorded';
end $$;

create or replace function public.akb_apply_square_refund(
  p_environment text, p_refund_id text, p_payment_id text, p_status text,
  p_amount_pence integer, p_currency text, p_refunded_on date
) returns text language plpgsql set search_path = public as $$
declare
  provider_name text := public.akb_square_provider(p_environment);
  pay record;
  charge uuid;
  key text := left(provider_name || '-refund:' || p_refund_id, 100);
begin
  if p_status in ('REJECTED', 'FAILED') then return 'not_refunded'; end if;
  if p_status <> 'COMPLETED' then return 'pending'; end if;
  if p_currency is distinct from 'GBP' then raise exception 'akb:currency_mismatch' using errcode = 'P0001'; end if;
  select * into pay from public.akb_payments where provider = provider_name and provider_payment_id = p_payment_id;
  if not found then return 'unknown_payment'; end if;
  if exists (select 1 from public.akb_refunds where idempotency_key = key) then return 'duplicate'; end if;
  select charge_id into charge from public.akb_square_payment_links where paid_payment_id = pay.id limit 1;
  -- The charge is owed again unless the coach cancels it: the reason for a refund is theirs to record.
  perform public.akb_refund_apply(pay.id, p_amount_pence, p_refunded_on, 'Square refund', key, charge, false, true);
  return 'recorded';
end $$;

-- ---------------------------------------------------------------------------
-- Access: server only, like every akb_ object.
-- ---------------------------------------------------------------------------

alter table public.akb_square_payment_links enable row level security;
alter table public.akb_square_events enable row level security;
revoke all on public.akb_square_payment_links from anon, authenticated;
revoke all on public.akb_square_events from anon, authenticated;

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

commit;

notify pgrst, 'reload schema';
