-- Memberships with class credits (owner's plans, content/memberships.ts):
-- Starter £40 / 4 credits, Regular £65 / 8, Dedicated £85 / 12, every four
-- weeks. Billed through the coach portal's ledger (a charge per period, paid by
-- bank transfer, cash or, once live, a Square payment link). Square
-- Subscriptions are not used: they couldn't be verified (CORE.md).
--
-- The membership terms and cancellation policy (content/policy.ts), enforced here:
-- - Credits are usable for any Monday, Wednesday or Saturday class inside their
--   own four-week period, and expire at its end (no roll-over).
-- - Memberships renew automatically every four weeks with new credits
--   (akb_renew_memberships, run daily by /api/cron/membership-renewals).
-- - Cancelling a place 24 hours or more before the class returns the credit;
--   later, or not turning up, forfeits it. If the coach cancels a class, the
--   credit is returned (akb_return_credit).
--
-- Adds tables, columns and functions only: creates, changes or deletes no
-- existing rows. Safe to run again. Server only (RLS on, no policies).

-- ---------------------------------------------------------------------------
-- Memberships and their periods
-- ---------------------------------------------------------------------------

create table if not exists public.akb_memberships (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  client_id uuid not null references public.akb_clients (id) on delete restrict,
  -- The request it came from, when it did (a plan chosen on the site).
  request_id uuid references public.akb_booking_requests (id) on delete set null,
  plan text not null check (plan in ('starter', 'regular', 'dedicated')),
  -- Price and credits as agreed when it started: later price changes don't rewrite them.
  plan_name text not null check (char_length(btrim(plan_name)) between 1 and 40),
  price_pence integer not null check (price_pence between 1 and 1000000),
  credits integer not null check (credits between 1 and 60),
  period_days integer not null default 28 check (period_days between 7 and 62),
  start_on date not null,
  -- The first day of the next period not yet created.
  next_period_on date not null,
  status text not null default 'active' check (status in ('active', 'paused', 'cancelled')),
  cancelled_on date,
  notes text not null default '' check (char_length(notes) <= 2000),
  check (next_period_on >= start_on),
  check ((status = 'cancelled') = (cancelled_on is not null))
);
-- At most one current (active or paused) membership per person.
create unique index if not exists akb_memberships_one_current on public.akb_memberships (client_id) where status in ('active', 'paused');
create index if not exists akb_memberships_renewal_idx on public.akb_memberships (next_period_on) where status = 'active';

create table if not exists public.akb_membership_periods (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  membership_id uuid not null references public.akb_memberships (id) on delete restrict,
  period_start date not null,
  -- Last day included.
  period_end date not null,
  credits integer not null check (credits between 0 and 60),
  -- The charge for this period: exactly one, never shared.
  charge_id uuid unique references public.akb_charges (id) on delete restrict,
  check (period_end >= period_start),
  -- One period per start date: renewing twice can't make a second one.
  unique (membership_id, period_start)
);
create index if not exists akb_membership_periods_dates_idx on public.akb_membership_periods (membership_id, period_start, period_end);

-- A class place paid for with a membership credit.
alter table public.akb_class_attendance
  add column if not exists membership_period_id uuid references public.akb_membership_periods (id) on delete restrict,
  -- Cancelled less than 24 hours before the class: the credit is forfeited.
  add column if not exists late_cancel boolean not null default false;
create index if not exists akb_class_attendance_period_idx on public.akb_class_attendance (membership_period_id) where membership_period_id is not null;

-- ---------------------------------------------------------------------------
-- Credit rules
-- ---------------------------------------------------------------------------

-- Credits a period has used: places booked, attended or missed, and places
-- cancelled late. Places cancelled in time don't count.
create or replace function public.akb_period_credits_used(p_period uuid, p_except uuid default null)
returns integer language sql stable set search_path = public as $$
  select count(*)::integer from public.akb_class_attendance
  where membership_period_id = p_period
    and (p_except is null or id <> p_except)
    and (status in ('booked', 'attended', 'no_show') or (status = 'cancelled' and late_cancel));
$$;

-- Keeps every credit honest: the place is the member's own, the class falls
-- inside the period, and the period never uses more credits than it has. Also
-- decides, when a member's place is cancelled, whether it was in time.
create or replace function public.akb_attendance_credit_rules() returns trigger
language plpgsql set search_path = public as $$
declare
  per record;
  cls record;
  uses boolean;
begin
  -- A member's place cancelled now: late if the class starts within 24 hours.
  -- (Not when the coach is giving the credit back: akb_return_credit says so.)
  if tg_op = 'UPDATE' and new.status = 'cancelled' and old.status <> 'cancelled'
     and new.membership_period_id is not null and new.late_cancel = old.late_cancel
     and coalesce(current_setting('akb.return_credit', true), '') <> 'on' then
    select starts_at into cls from public.akb_class_sessions where id = new.class_session_id;
    new.late_cancel := cls.starts_at - now() < interval '24 hours';
  end if;
  if new.membership_period_id is null then return new; end if;

  -- Locks the period, so two places booked at once can't both take its last credit.
  select p.*, m.client_id into per from public.akb_membership_periods p
    join public.akb_memberships m on m.id = p.membership_id
    where p.id = new.membership_period_id for update of p;
  if not found then raise exception 'akb:not_found' using errcode = 'P0001'; end if;
  if per.client_id <> new.client_id then raise exception 'akb:credit_not_theirs' using errcode = 'P0001'; end if;
  select class_date into cls from public.akb_class_sessions where id = new.class_session_id;
  if cls.class_date < per.period_start or cls.class_date > per.period_end then
    raise exception 'akb:credit_outside_period' using errcode = 'P0001';
  end if;
  uses := new.status in ('booked', 'attended', 'no_show') or (new.status = 'cancelled' and new.late_cancel);
  if uses and public.akb_period_credits_used(new.membership_period_id, new.id) + 1 > per.credits then
    raise exception 'akb:no_credits' using errcode = 'P0001';
  end if;
  return new;
end $$;

create or replace trigger akb_class_attendance_credit_rules
  before insert or update of membership_period_id, status, late_cancel, class_session_id, client_id
  on public.akb_class_attendance for each row execute function public.akb_attendance_credit_rules();

-- ---------------------------------------------------------------------------
-- Periods and renewals
-- ---------------------------------------------------------------------------

-- Creates every period (with its charge) due on or before p_through, for an
-- active membership. Idempotent: running it again creates nothing new.
create or replace function public.akb_membership_ensure_periods(p_membership uuid, p_through date)
returns integer language plpgsql set search_path = public as $$
declare
  m record;
  v_start date;
  v_end date;
  chg uuid;
  made integer := 0;
begin
  select * into m from public.akb_memberships where id = p_membership for update;
  if not found then raise exception 'akb:not_found' using errcode = 'P0001'; end if;
  if m.status <> 'active' then return 0; end if;
  v_start := m.next_period_on;
  while v_start <= p_through loop
    v_end := v_start + m.period_days - 1;
    insert into public.akb_charges (client_id, service, description, amount_pence, due_on)
      values (m.client_id, 'group',
              left(format('%s membership, %s to %s', m.plan_name, to_char(v_start, 'FMDD Mon'), to_char(v_end, 'FMDD Mon YYYY')), 200),
              m.price_pence, v_start)
      returning id into chg;
    insert into public.akb_membership_periods (membership_id, period_start, period_end, credits, charge_id)
      values (m.id, v_start, v_end, m.credits, chg);
    insert into public.akb_events (client_id, entity, entity_id, action, detail)
      values (m.client_id, 'membership', m.id, 'period_started',
              jsonb_build_object('period_start', v_start, 'period_end', v_end, 'credits', m.credits, 'charge_id', chg));
    made := made + 1;
    v_start := v_start + m.period_days;
  end loop;
  update public.akb_memberships set next_period_on = v_start, updated_at = now() where id = m.id and v_start <> m.next_period_on;
  return made;
end $$;

-- Starts a membership and its first period (and the first charge) together.
create or replace function public.akb_start_membership(
  p_client uuid, p_plan text, p_plan_name text, p_price_pence integer, p_credits integer,
  p_start_on date, p_request uuid default null, p_notes text default ''
) returns uuid language plpgsql set search_path = public as $$
declare
  mid uuid;
begin
  insert into public.akb_memberships (client_id, request_id, plan, plan_name, price_pence, credits, start_on, next_period_on, notes)
    values (p_client, p_request, p_plan, p_plan_name, p_price_pence, p_credits, p_start_on, p_start_on, coalesce(p_notes, ''))
    returning id into mid;
  insert into public.akb_events (client_id, entity, entity_id, action, detail)
    values (p_client, 'membership', mid, 'started',
            jsonb_build_object('plan', p_plan, 'price_pence', p_price_pence, 'credits', p_credits, 'start_on', p_start_on));
  perform public.akb_membership_ensure_periods(mid, p_start_on);
  return mid;
end $$;

-- Daily: renews every active membership whose next period has begun. Returns
-- how many periods were created. Safe to run any number of times.
create or replace function public.akb_renew_memberships(p_today date)
returns integer language plpgsql set search_path = public as $$
declare
  r record;
  made integer := 0;
begin
  for r in select id from public.akb_memberships where status = 'active' and next_period_on <= p_today order by next_period_on loop
    made := made + public.akb_membership_ensure_periods(r.id, p_today);
  end loop;
  return made;
end $$;

-- Pause (no new periods), resume (the next period starts on p_on at the
-- earliest), or cancel (no new periods; credits already given stay usable in
-- their period). Each is logged.
create or replace function public.akb_set_membership_status(p_membership uuid, p_status text, p_on date)
returns void language plpgsql set search_path = public as $$
declare
  m record;
begin
  if p_status not in ('active', 'paused', 'cancelled') then raise exception 'akb:invalid_status' using errcode = 'P0001'; end if;
  select * into m from public.akb_memberships where id = p_membership for update;
  if not found then raise exception 'akb:not_found' using errcode = 'P0001'; end if;
  if m.status = 'cancelled' then raise exception 'akb:membership_cancelled' using errcode = 'P0001'; end if;
  if m.status = p_status then return; end if;
  if p_status = 'cancelled' then
    update public.akb_memberships set status = 'cancelled', cancelled_on = p_on, updated_at = now() where id = m.id;
  elsif p_status = 'active' then
    update public.akb_memberships set status = 'active', next_period_on = greatest(next_period_on, p_on), updated_at = now() where id = m.id;
  else
    update public.akb_memberships set status = 'paused', updated_at = now() where id = m.id;
  end if;
  insert into public.akb_events (client_id, entity, entity_id, action, detail)
    values (m.client_id, 'membership', m.id, p_status, jsonb_build_object('from', m.status, 'on', p_on));
end $$;

-- Pays for a class place with a credit from the member's period covering the
-- class date. Errors (no_membership, no_credits) say why it can't.
create or replace function public.akb_use_membership_credit(p_attendance uuid)
returns uuid language plpgsql set search_path = public as $$
declare
  a record;
  pid uuid;
  chg uuid;
begin
  select att.*, s.class_date into a from public.akb_class_attendance att
    join public.akb_class_sessions s on s.id = att.class_session_id
    where att.id = p_attendance for update of att;
  if not found then raise exception 'akb:not_found' using errcode = 'P0001'; end if;
  if a.membership_period_id is not null then return a.membership_period_id; end if;
  select p.id into pid from public.akb_membership_periods p
    join public.akb_memberships m on m.id = p.membership_id
    where m.client_id = a.client_id and a.class_date between p.period_start and p.period_end
    order by p.period_start desc limit 1;
  if pid is null then raise exception 'akb:no_membership' using errcode = 'P0001'; end if;
  -- The trigger checks the credits (and raises no_credits).
  update public.akb_class_attendance set membership_period_id = pid, updated_at = now() where id = p_attendance;
  -- A pay-as-you-go charge for this place, if one was raised and nothing is paid against it, is cancelled.
  select c.id into chg from public.akb_charges c
    where c.attendance_id = p_attendance and c.voided_at is null
      and not exists (select 1 from public.akb_payment_allocations x where x.charge_id = c.id);
  if chg is not null then
    update public.akb_charges set voided_at = now(), void_reason = 'Paid with a membership credit' where id = chg;
  end if;
  insert into public.akb_events (client_id, entity, entity_id, action, detail)
    values (a.client_id, 'attendance', p_attendance, 'credit_used', jsonb_build_object('period_id', pid));
  return pid;
end $$;

-- Gives a forfeited credit back (the coach cancelled the class, or goodwill).
create or replace function public.akb_return_credit(p_attendance uuid)
returns void language plpgsql set search_path = public as $$
declare
  a record;
begin
  select * into a from public.akb_class_attendance where id = p_attendance for update;
  if not found then raise exception 'akb:not_found' using errcode = 'P0001'; end if;
  if a.membership_period_id is null then raise exception 'akb:no_membership' using errcode = 'P0001'; end if;
  if a.status = 'cancelled' and not a.late_cancel then return; end if;
  perform set_config('akb.return_credit', 'on', true);
  update public.akb_class_attendance set status = 'cancelled', late_cancel = false, updated_at = now() where id = p_attendance;
  insert into public.akb_events (client_id, entity, entity_id, action, detail)
    values (a.client_id, 'attendance', p_attendance, 'credit_returned', jsonb_build_object('from', a.status));
  perform set_config('akb.return_credit', '', true);
end $$;

-- Each period with its credits used and left (for the portal).
create or replace view public.akb_membership_period_balances as
  select p.*, m.client_id, m.plan, m.plan_name,
         public.akb_period_credits_used(p.id) as credits_used,
         greatest(p.credits - public.akb_period_credits_used(p.id), 0) as credits_left
  from public.akb_membership_periods p join public.akb_memberships m on m.id = p.membership_id;

-- ---------------------------------------------------------------------------
-- Access: server only
-- ---------------------------------------------------------------------------

alter table public.akb_memberships enable row level security;
alter table public.akb_membership_periods enable row level security;
revoke all on public.akb_memberships from anon, authenticated;
revoke all on public.akb_membership_periods from anon, authenticated;
revoke all on public.akb_membership_period_balances from anon, authenticated;
alter view public.akb_membership_period_balances set (security_invoker = true);

do $$
declare
  f record;
begin
  for f in
    select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname in (
      'akb_period_credits_used', 'akb_attendance_credit_rules', 'akb_membership_ensure_periods', 'akb_start_membership',
      'akb_renew_memberships', 'akb_set_membership_status', 'akb_use_membership_credit', 'akb_return_credit')
  loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
    execute format('grant execute on function %s to service_role', f.sig);
  end loop;
end $$;

notify pgrst, 'reload schema';
