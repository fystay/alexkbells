-- Joining a membership online and paying for it, with nothing for Alex to
-- confirm (owner, 2026-10-26: "user can pay for membership without Alex having
-- to confirm"; choices: pay on Square's page, a pay link for each renewal,
-- credits usable once Square confirms payment, the optional first class booked
-- as soon as it's paid).
--
-- 1. The join form calls akb_create_membership_signup: it finds or creates the
--    client by email, raises one charge for the first four weeks at the plan's
--    price, and records a sign-up waiting for payment. The website then opens a
--    Square payment link for that charge (the existing akb_square_payment_links
--    machinery).
-- 2. Square's verified webhook (or the daily reconcile, or Alex recording a
--    payment in the portal) allocates a payment to the charge. When the charge
--    is fully paid, a trigger starts the membership on that same charge (no
--    second charge), marks it pay_online, and books the first class if one was
--    chosen and is still free. Nothing ever undoes a recorded payment: if the
--    membership can't start (say Alex started one by hand meanwhile), the
--    sign-up is marked needs_attention and the payment stays recorded.
-- 3. A pay_online membership's credits can only be used once its period's
--    charge is paid (akb_class_attendance_period_paid). Renewals still create
--    a period and a charge every four weeks (akb_renew_memberships); the
--    renewal job emails the member a pay link for each unpaid period and notes
--    it in pay_link_sent_at.
--
-- Depends on 20261021000000_akb_square.sql, 20261023000000_akb_memberships.sql
-- and 20261027000000_akb_member_accounts.sql (akb_is_member,
-- akb_member_book_class, akb_london_today). Adds two columns (with defaults
-- that keep today's behaviour for every existing membership), one table, two
-- triggers and four functions. Changes and deletes no existing rows. Server
-- only (RLS on, no policies; functions for service_role only).

begin;

alter table public.akb_memberships
  -- Joined and paid online: each period's credits wait for its charge to be paid.
  add column if not exists pay_online boolean not null default false;

alter table public.akb_membership_periods
  -- When the renewal job emailed the member a pay link for this period.
  add column if not exists pay_link_sent_at timestamptz;

create table if not exists public.akb_membership_signups (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  client_id uuid not null references public.akb_clients (id) on delete restrict,
  plan text not null check (plan in ('starter', 'regular', 'dedicated')),
  plan_name text not null check (char_length(btrim(plan_name)) between 1 and 40),
  price_pence integer not null check (price_pence between 1 and 1000000),
  credits integer not null check (credits between 1 and 60),
  -- The first four weeks' charge, paid through Square.
  charge_id uuid not null unique references public.akb_charges (id) on delete restrict,
  -- The optional first class, from the published timetable (all four or none).
  class_slot text check (char_length(class_slot) between 1 and 40),
  class_date date,
  class_starts_at timestamptz,
  class_duration integer check (class_duration between 15 and 240),
  terms_agreed_at timestamptz not null,
  status text not null default 'awaiting_payment'
    check (status in ('awaiting_payment', 'active', 'replaced', 'needs_attention')),
  membership_id uuid references public.akb_memberships (id) on delete restrict,
  first_class text not null default 'none' check (first_class in ('none', 'requested', 'booked', 'unavailable')),
  -- When Alex and the member were emailed that the membership started.
  notified_at timestamptz,
  -- One sign-up per form submission, however often it's sent.
  idempotency_key text not null unique check (char_length(idempotency_key) between 8 and 100),
  check (num_nonnulls(class_slot, class_date, class_starts_at, class_duration) in (0, 4)),
  check ((status = 'active') = (membership_id is not null))
);
-- At most one sign-up waiting for payment per person: a new one replaces it.
create unique index if not exists akb_membership_signups_one_waiting
  on public.akb_membership_signups (client_id) where status = 'awaiting_payment';
create index if not exists akb_membership_signups_notify_idx
  on public.akb_membership_signups (created_at) where status in ('active', 'needs_attention') and notified_at is null;

-- ---------------------------------------------------------------------------
-- Joining
-- ---------------------------------------------------------------------------

-- Returns {signup_id, charge_id, status}. Errors (akb:...): already_member,
-- payment_in_progress (an earlier sign-up of theirs is part paid: Alex sorts it).
create or replace function public.akb_create_membership_signup(
  p_name text, p_email text, p_phone text,
  p_plan text, p_plan_name text, p_price_pence integer, p_credits integer,
  p_class_slot text, p_class_date date, p_class_starts_at timestamptz, p_class_duration integer,
  p_terms_agreed_at timestamptz, p_idempotency_key text
) returns jsonb language plpgsql set search_path = public as $$
declare
  s record;
  cid uuid;
  chg uuid;
  sid uuid;
  old record;
  v_email text := lower(btrim(coalesce(p_email, '')));
begin
  select * into s from public.akb_membership_signups where idempotency_key = p_idempotency_key;
  if found then
    return jsonb_build_object('signup_id', s.id, 'charge_id', s.charge_id, 'status', s.status);
  end if;
  if v_email = '' then raise exception 'akb:invalid_email' using errcode = 'P0001'; end if;

  select c.id into cid from public.akb_clients c where lower(c.email) = v_email for update;
  if cid is null then
    insert into public.akb_clients (full_name, email, phone, status)
      values (left(btrim(p_name), 100), v_email, left(btrim(coalesce(p_phone, '')), 30), 'lead')
      returning id into cid;
  end if;
  if public.akb_is_member(cid) then raise exception 'akb:already_member' using errcode = 'P0001'; end if;

  -- A sign-up they started before and didn't pay is replaced (its charge and link are retired).
  select * into old from public.akb_membership_signups where client_id = cid and status = 'awaiting_payment' for update;
  if found then
    if exists (select 1 from public.akb_payment_allocations where charge_id = old.charge_id) then
      raise exception 'akb:payment_in_progress' using errcode = 'P0001';
    end if;
    perform public.akb_void_charge(old.charge_id, 'Replaced by a new online sign-up');
    update public.akb_membership_signups set status = 'replaced', updated_at = now() where id = old.id;
  end if;

  insert into public.akb_charges (client_id, service, description, amount_pence, due_on)
    values (cid, 'group', left(format('%s membership, first 4 weeks', p_plan_name), 200), p_price_pence, public.akb_london_today())
    returning id into chg;
  insert into public.akb_membership_signups (
    client_id, plan, plan_name, price_pence, credits, charge_id,
    class_slot, class_date, class_starts_at, class_duration, terms_agreed_at,
    first_class, idempotency_key)
  values (
    cid, p_plan, p_plan_name, p_price_pence, p_credits, chg,
    p_class_slot, p_class_date, p_class_starts_at, p_class_duration, p_terms_agreed_at,
    case when p_class_date is null then 'none' else 'requested' end, p_idempotency_key)
  returning id into sid;
  insert into public.akb_events (client_id, entity, entity_id, action, detail)
    values (cid, 'membership_signup', sid, 'created',
            jsonb_build_object('plan', p_plan, 'price_pence', p_price_pence, 'charge_id', chg, 'first_class', p_class_date));
  return jsonb_build_object('signup_id', sid, 'charge_id', chg, 'status', 'awaiting_payment');
end $$;

-- ---------------------------------------------------------------------------
-- Starting the membership once the first charge is paid
-- ---------------------------------------------------------------------------

create or replace function public.akb_signup_on_payment() returns trigger
language plpgsql set search_path = public as $$
declare
  s record;
  owed integer;
  today date := public.akb_london_today();
  mid uuid;
begin
  select * into s from public.akb_membership_signups
    where charge_id = new.charge_id and status = 'awaiting_payment' for update;
  if not found then return null; end if;
  select outstanding_pence into owed from public.akb_charge_balances where id = new.charge_id;
  if owed > 0 then return null; end if;

  begin
    insert into public.akb_memberships (client_id, plan, plan_name, price_pence, credits, start_on, next_period_on, pay_online, notes)
      values (s.client_id, s.plan, s.plan_name, s.price_pence, s.credits, today, today + 28, true, 'Joined and paid online')
      returning id into mid;
    -- The first period is the charge they just paid: no second charge.
    insert into public.akb_membership_periods (membership_id, period_start, period_end, credits, charge_id)
      values (mid, today, today + 27, s.credits, s.charge_id);
    update public.akb_clients set status = 'active', updated_at = now() where id = s.client_id and status <> 'active';
    insert into public.akb_events (client_id, entity, entity_id, action, detail)
      values (s.client_id, 'membership', mid, 'started',
              jsonb_build_object('plan', s.plan, 'price_pence', s.price_pence, 'credits', s.credits, 'start_on', today,
                                 'signup_id', s.id, 'paid_online', true));
    update public.akb_membership_signups set status = 'active', membership_id = mid, updated_at = now() where id = s.id;
  exception when others then
    -- Never lose a payment: it stays recorded against the charge; Alex finishes the set-up.
    update public.akb_membership_signups set status = 'needs_attention', updated_at = now() where id = s.id;
    insert into public.akb_events (client_id, entity, entity_id, action, detail)
      values (s.client_id, 'membership_signup', s.id, 'needs_attention', jsonb_build_object('error', left(sqlerrm, 200)));
    return null;
  end;

  if s.class_date is not null then
    begin
      perform public.akb_member_book_class(s.client_id, s.class_slot, s.class_date, s.class_starts_at, s.class_duration);
      update public.akb_membership_signups set first_class = 'booked' where id = s.id;
    exception when others then
      -- Full, cancelled, already started or outside the first four weeks: they book another from their account.
      update public.akb_membership_signups set first_class = 'unavailable' where id = s.id;
    end;
  end if;
  return null;
end $$;

drop trigger if exists akb_payment_allocations_signup on public.akb_payment_allocations;
-- Insert or top-up (akb_allocate_payment adds to an existing allocation).
create trigger akb_payment_allocations_signup
  after insert or update of amount_pence on public.akb_payment_allocations
  for each row execute function public.akb_signup_on_payment();

-- ---------------------------------------------------------------------------
-- Credits wait for payment (pay_online memberships only)
-- ---------------------------------------------------------------------------

create or replace function public.akb_class_attendance_period_paid() returns trigger
language plpgsql set search_path = public as $$
declare
  per record;
begin
  if new.membership_period_id is null or new.status not in ('booked', 'attended', 'no_show') then return new; end if;
  -- Already using this period's credit (e.g. marked attended): nothing new to check.
  if tg_op = 'UPDATE' and old.membership_period_id is not distinct from new.membership_period_id
     and old.status in ('booked', 'attended', 'no_show') then
    return new;
  end if;
  select m.pay_online, b.outstanding_pence into per
    from public.akb_membership_periods p
    join public.akb_memberships m on m.id = p.membership_id
    left join public.akb_charge_balances b on b.id = p.charge_id
    where p.id = new.membership_period_id;
  if per.pay_online and coalesce(per.outstanding_pence, 0) > 0 then
    raise exception 'akb:period_unpaid' using errcode = 'P0001';
  end if;
  return new;
end $$;

drop trigger if exists akb_class_attendance_period_paid on public.akb_class_attendance;
create trigger akb_class_attendance_period_paid
  before insert or update of membership_period_id, status
  on public.akb_class_attendance for each row execute function public.akb_class_attendance_period_paid();

-- ---------------------------------------------------------------------------
-- What the website needs to read
-- ---------------------------------------------------------------------------

-- The unpaid periods of pay_online memberships that have started and haven't
-- had a pay link emailed yet (for the renewal job), as a JSON list (at most 100).
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
    order by p.period_start
    limit 100
  ) x;
$$;

-- The member's current period, if it's a pay_online one still owed (for their account page).
create or replace function public.akb_member_payment_due(p_client uuid)
returns jsonb language sql stable set search_path = public as $$
  select jsonb_build_object('charge_id', p.charge_id, 'outstanding_pence', b.outstanding_pence,
                            'period_start', p.period_start, 'period_end', p.period_end)
  from public.akb_membership_periods p
  join public.akb_memberships m on m.id = p.membership_id
  join public.akb_charge_balances b on b.id = p.charge_id
  where m.client_id = p_client and m.pay_online
    and public.akb_london_today() between p.period_start and p.period_end
    and b.outstanding_pence > 0
  order by p.period_start desc
  limit 1;
$$;

-- ---------------------------------------------------------------------------
-- Access: server only
-- ---------------------------------------------------------------------------

alter table public.akb_membership_signups enable row level security;
revoke all on public.akb_membership_signups from anon, authenticated;
grant select, update on public.akb_membership_signups to service_role;

do $$
declare
  f record;
begin
  for f in
    select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname in (
      'akb_create_membership_signup', 'akb_signup_on_payment', 'akb_class_attendance_period_paid',
      'akb_unpaid_online_periods', 'akb_member_payment_due')
  loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
    execute format('grant execute on function %s to service_role', f.sig);
  end loop;
end $$;

notify pgrst, 'reload schema';

commit;
