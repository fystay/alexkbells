-- Memberships by Direct Debit (owner, 2026-10-30; industry standard, like the big gyms):
-- the first 4 weeks are paid by card on Stripe's page, then the member sets up
-- a Bacs Direct Debit and each later 4 weeks is collected by it. They can
-- cancel any time: no more periods or collections, and the credits already
-- given stay usable until their period ends (akb_set_membership_status).
--
-- - akb_stripe_customers: one row per client with a Stripe customer and, once
--   set up, a Direct Debit payment method and mandate. RLS on, server only.
-- - akb_dd_collections: one row per period collected by Direct Debit: the
--   Stripe payment intent, its state and how many tries (a failed one is
--   retried, then the membership is paused).
-- - Collections are submitted ahead of the period (Bacs takes about three
--   working days), so a Direct Debit member's next period is created a few
--   days early (akb_renew_dd_memberships) and its credits work from day one.
-- - Members with an active Direct Debit are left out of the emailed pay links
--   (akb_unpaid_online_periods is replaced).
-- The payment itself is recorded by the existing akb_apply_square_payment,
-- with the payment intent id as the "order", through an open link row whose
-- url is the word 'direct-debit' (there is no page to open).
--
-- Adds two tables and functions; replaces akb_unpaid_online_periods. Changes
-- no existing row. Safe to run again. Tests: src/lib/stripe/direct-debit.test.ts.

begin;

create table if not exists public.akb_stripe_customers (
  client_id uuid primary key references public.akb_clients (id) on delete cascade,
  environment text not null check (environment in ('sandbox', 'production')),
  customer_id text not null unique,
  payment_method_id text,
  mandate_id text,
  dd_status text not null default 'pending' check (dd_status in ('pending', 'active', 'ended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.akb_stripe_customers enable row level security;
revoke all on public.akb_stripe_customers from public, anon, authenticated;
grant select, insert, update on public.akb_stripe_customers to service_role;

create trigger akb_stripe_customers_environment before insert or update of environment on public.akb_stripe_customers
  for each row execute function public.akb_square_environment_guard();

create table if not exists public.akb_dd_collections (
  period_id uuid primary key references public.akb_membership_periods (id) on delete cascade,
  client_id uuid not null references public.akb_clients (id) on delete cascade,
  environment text not null check (environment in ('sandbox', 'production')),
  payment_intent_id text not null unique,
  status text not null default 'submitted' check (status in ('submitted', 'succeeded', 'failed')),
  attempts integer not null default 1 check (attempts between 1 and 20),
  last_attempt_on date not null,
  paused boolean not null default false,
  notified_at timestamptz,
  updated_at timestamptz not null default now()
);
alter table public.akb_dd_collections enable row level security;
revoke all on public.akb_dd_collections from public, anon, authenticated;
grant select, insert, update on public.akb_dd_collections to service_role;

create trigger akb_dd_collections_environment before insert or update of environment on public.akb_dd_collections
  for each row execute function public.akb_square_environment_guard();

-- A client's Stripe customer (made before the Direct Debit set-up page opens).
create or replace function public.akb_dd_begin(p_client uuid, p_environment text, p_customer text)
returns void language sql set search_path = public as $$
  insert into public.akb_stripe_customers (client_id, environment, customer_id)
    values (p_client, p_environment, p_customer)
    on conflict (client_id) do nothing;
$$;

-- Set-up finished: the Direct Debit method and mandate are on file.
create or replace function public.akb_dd_set_method(p_client uuid, p_environment text, p_customer text, p_method text, p_mandate text)
returns text language plpgsql set search_path = public as $$
declare
  row record;
begin
  select * into row from public.akb_stripe_customers where client_id = p_client for update;
  if not found then return 'unknown_client'; end if;
  if row.environment <> p_environment or row.customer_id <> p_customer then return 'mismatch'; end if;
  update public.akb_stripe_customers
    set payment_method_id = p_method, mandate_id = p_mandate, dd_status = 'active', updated_at = now()
    where client_id = p_client;
  insert into public.akb_events (client_id, entity, entity_id, action, detail)
    values (p_client, 'membership', p_client, 'direct_debit_set_up', jsonb_build_object('mandate', p_mandate));
  return 'active';
end $$;

-- The member's Direct Debit state for their account page.
create or replace function public.akb_dd_state(p_client uuid)
returns text language sql stable set search_path = public as $$
  select coalesce((select dd_status from public.akb_stripe_customers where client_id = p_client), 'none');
$$;

-- Direct Debit members renew early so each collection clears before its period starts.
create or replace function public.akb_renew_dd_memberships(p_today date, p_lead_days integer default 6)
returns integer language plpgsql set search_path = public as $$
declare
  r record;
  made integer := 0;
begin
  for r in
    select m.id from public.akb_memberships m
    join public.akb_stripe_customers d on d.client_id = m.client_id and d.dd_status = 'active'
    where m.status = 'active' and m.next_period_on <= p_today + p_lead_days
    order by m.next_period_on
  loop
    made := made + public.akb_membership_ensure_periods(r.id, p_today + p_lead_days);
  end loop;
  return made;
end $$;

-- Periods to collect now: an active membership with an active Direct Debit, a
-- period starting within the lead days (or already begun) with money owed, and
-- nothing in flight. A failed try is retried after three days, up to p_max tries.
create or replace function public.akb_dd_due(p_today date, p_lead_days integer default 6, p_max integer default 3)
returns jsonb language sql stable set search_path = public as $$
  select coalesce(jsonb_agg(to_jsonb(x) order by x.period_start), '[]'::jsonb) from (
    select p.id as period_id, p.charge_id, m.client_id, c.email, c.full_name, m.plan_name,
           p.period_start, p.period_end, b.outstanding_pence,
           d.customer_id, d.payment_method_id, d.environment,
           coalesce(k.attempts, 0) as attempts
    from public.akb_membership_periods p
    join public.akb_memberships m on m.id = p.membership_id
    join public.akb_clients c on c.id = m.client_id
    join public.akb_charge_balances b on b.id = p.charge_id
    join public.akb_stripe_customers d on d.client_id = m.client_id and d.dd_status = 'active' and d.payment_method_id is not null
    left join public.akb_dd_collections k on k.period_id = p.id
    where m.status = 'active' and b.outstanding_pence > 0 and b.voided_at is null
      and p.period_start <= p_today + p_lead_days and p.period_end >= p_today
      and (k.period_id is null
           or (k.status = 'failed' and not k.paused and k.attempts < p_max and k.last_attempt_on <= p_today - 3))
    order by p.period_start
    limit 100
  ) x;
$$;

-- A collection was submitted to Stripe: remember it, and open a link row so
-- the payment, when Stripe confirms it, is recorded against the period's charge.
create or replace function public.akb_dd_record_attempt(p_period uuid, p_environment text, p_payment_intent text, p_today date)
returns void language plpgsql set search_path = public as $$
declare
  per record;
  bal record;
begin
  select p.id, p.charge_id, m.client_id into per
    from public.akb_membership_periods p join public.akb_memberships m on m.id = p.membership_id where p.id = p_period for update of p;
  if not found then raise exception 'akb:not_found' using errcode = 'P0001'; end if;
  select * into bal from public.akb_charge_balances where id = per.charge_id;
  -- Any card link still open for this charge is closed: the Direct Debit is how it is paid now.
  update public.akb_square_payment_links set status = 'cancelled' where charge_id = per.charge_id and status in ('creating', 'open');
  insert into public.akb_square_payment_links (environment, charge_id, client_id, amount_pence, status, square_link_id, square_order_id, url)
    values (p_environment, per.charge_id, per.client_id, bal.outstanding_pence, 'open', p_payment_intent, p_payment_intent, 'direct-debit');
  insert into public.akb_dd_collections (period_id, client_id, environment, payment_intent_id, last_attempt_on)
    values (p_period, per.client_id, p_environment, p_payment_intent, p_today)
    on conflict (period_id) do update
      set payment_intent_id = excluded.payment_intent_id, status = 'submitted', attempts = public.akb_dd_collections.attempts + 1,
          last_attempt_on = excluded.last_attempt_on, notified_at = null, updated_at = now();
end $$;

-- Stripe says a collection cleared or failed. A third failure pauses the membership
-- (no more periods) until Alex or the member sorts the payment out.
create or replace function public.akb_dd_mark(p_payment_intent text, p_status text)
returns text language plpgsql set search_path = public as $$
declare
  k record;
  mem uuid;
begin
  select * into k from public.akb_dd_collections where payment_intent_id = p_payment_intent for update;
  if not found then return 'unknown_collection'; end if;
  if p_status = 'succeeded' then
    update public.akb_dd_collections set status = 'succeeded', updated_at = now() where period_id = k.period_id;
    return 'succeeded';
  end if;
  if p_status <> 'failed' then return 'ignored'; end if;
  if k.status = 'failed' then return 'duplicate'; end if;
  -- The dead link closes, so a retry can open a new one.
  update public.akb_square_payment_links set status = 'cancelled' where square_order_id = p_payment_intent and status = 'open';
  update public.akb_dd_collections set status = 'failed', updated_at = now() where period_id = k.period_id;
  if k.attempts >= 3 then
    select membership_id into mem from public.akb_membership_periods where id = k.period_id;
    perform public.akb_set_membership_status(mem, 'paused', public.akb_london_today());
    update public.akb_dd_collections set paused = true where period_id = k.period_id;
    return 'paused';
  end if;
  return 'failed';
end $$;

-- Direct Debit members aren't sent a card pay link: their renewal is collected.
create or replace function public.akb_unpaid_online_periods(p_today date)
returns jsonb language sql stable set search_path = public as $$
  select coalesce(jsonb_agg(to_jsonb(x) order by x.period_start), '[]'::jsonb) from (
    select p.id as period_id, p.charge_id, m.client_id, c.full_name, c.email, m.plan_name,
           p.period_start, p.period_end, b.outstanding_pence
    from public.akb_membership_periods p
    join public.akb_memberships m on m.id = p.membership_id
    join public.akb_clients c on c.id = m.client_id
    join public.akb_charge_balances b on b.id = p.charge_id
    where m.pay_online and m.status = 'active' and p.pay_link_sent_at is null
      and p.period_start <= p_today and p.period_end >= p_today and b.outstanding_pence > 0
      and not exists (select 1 from public.akb_stripe_customers d where d.client_id = m.client_id and d.dd_status = 'active')
    order by p.period_start
    limit 100
  ) x;
$$;

-- Server only.
do $$
declare
  f record;
begin
  for f in
    select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname in (
      'akb_dd_begin', 'akb_dd_set_method', 'akb_dd_state', 'akb_renew_dd_memberships', 'akb_dd_due',
      'akb_dd_record_attempt', 'akb_dd_mark', 'akb_unpaid_online_periods')
  loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
    execute format('grant execute on function %s to service_role', f.sig);
  end loop;
end $$;

notify pgrst, 'reload schema';

commit;
