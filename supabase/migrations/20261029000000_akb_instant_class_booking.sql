-- Booking a group class and paying for it online, with nothing for Alex to
-- confirm (owner, 2026-10-27: group classes instant, 1:1 stays a request;
-- the place is held for 15 minutes while paying; cancelling 24 hours or more
-- before a paid class gives a credit for another class within 4 weeks).
--
-- 1. akb_create_class_booking: finds or creates the client by email, puts a
--    place on the class held for 15 minutes (hold_expires_at), raises one
--    charge at the class price and records the booking. The website then
--    opens a Square payment link for that charge. With a class credit
--    instead, the place is confirmed at once and nothing is charged.
-- 2. When the charge is fully paid (Square's verified webhook, the reconcile,
--    or Alex in the portal), a trigger confirms the place (hold cleared). A
--    payment that arrives after the hold ran out confirms the place if the
--    class still has room; otherwise the booking is marked needs_attention and
--    the payment stays recorded for Alex to sort out.
-- 3. Capacity counts only live places: booked or attended, and not a hold
--    that has run out. So an expired hold never blocks anyone, even before the
--    clean-up (akb_release_class_holds) marks it cancelled. The clean-up
--    cancels an unpaid booking's charge 24 hours after its hold ran out.
-- 4. Cancelling by the booking's private link (akb_cancel_class_booking): 24
--    hours or more before the class, a single-use class credit valid for 28
--    days; later, nothing back (Alex's class cancellation policy).
--
-- Depends on 20261021000000_akb_square.sql (akb_void_charge),
-- 20261024000000_akb_cancel_class.sql (akb_class_overview's cancelled
-- columns) and 20261027000000_akb_member_accounts.sql (akb_london_today).
-- Adds one column (empty: every existing place stays live), two tables and
-- functions; replaces the capacity trigger function and akb_class_overview so
-- they ignore expired holds (identical results while no hold exists).
-- Changes and deletes no existing rows. Server only.

begin;

alter table public.akb_class_attendance
  -- A place held while someone pays online. Null: a real place.
  add column if not exists hold_expires_at timestamptz;

-- A place counts towards capacity unless it's a hold that has run out.
create or replace function public.akb_attendance_capacity() returns trigger
language plpgsql set search_path = public as $$
declare
  cap integer;
  taken integer;
begin
  if new.status not in ('booked', 'attended') then return new; end if;
  if tg_op = 'UPDATE' and old.status in ('booked', 'attended') and old.class_session_id = new.class_session_id
     and (old.hold_expires_at is null or old.hold_expires_at > now()) then
    return new;
  end if;
  select capacity into cap from public.akb_class_sessions where id = new.class_session_id for update;
  if cap is null then return new; end if;
  select count(*) into taken from public.akb_class_attendance
    where class_session_id = new.class_session_id and status in ('booked', 'attended')
      and (hold_expires_at is null or hold_expires_at > now()) and id <> new.id;
  if taken >= cap then
    raise exception 'akb:class_full' using errcode = 'P0001';
  end if;
  return new;
end $$;

drop trigger if exists akb_attendance_capacity on public.akb_class_attendance;
create trigger akb_attendance_capacity before insert or update of status, class_session_id, hold_expires_at on public.akb_class_attendance
  for each row execute function public.akb_attendance_capacity();

create or replace view public.akb_class_overview with (security_invoker = true) as
  select s.id, s.created_at, s.updated_at, s.slot, s.class_date, s.starts_at, s.duration_minutes, s.capacity, s.notes,
    (select count(*) from public.akb_class_attendance a where a.class_session_id = s.id and a.status in ('booked', 'attended')
       and (a.hold_expires_at is null or a.hold_expires_at > now()))::integer as booked,
    (select count(*) from public.akb_class_attendance a where a.class_session_id = s.id and a.status = 'attended')::integer as attended,
    s.cancelled_at, s.cancel_reason
  from public.akb_class_sessions s;
revoke all on public.akb_class_overview from public, anon, authenticated;
grant select on public.akb_class_overview to service_role;

create table if not exists public.akb_class_bookings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  client_id uuid not null references public.akb_clients (id) on delete restrict,
  attendance_id uuid not null references public.akb_class_attendance (id) on delete restrict,
  -- The class price, paid through Square. Null when a class credit paid for it.
  charge_id uuid unique references public.akb_charges (id) on delete restrict,
  status text not null default 'awaiting_payment'
    check (status in ('awaiting_payment', 'confirmed', 'expired', 'cancelled', 'needs_attention')),
  -- SHA-256 of the private "manage your booking" link, set when the confirmation is emailed.
  manage_token_hash text unique check (manage_token_hash ~ '^[0-9a-f]{64}$'),
  -- When the booker and Alex were emailed that it's confirmed.
  notified_at timestamptz,
  idempotency_key text not null unique check (char_length(idempotency_key) between 8 and 100)
);
create index if not exists akb_class_bookings_attendance_idx on public.akb_class_bookings (attendance_id);
create index if not exists akb_class_bookings_notify_idx on public.akb_class_bookings (created_at)
  where status in ('confirmed', 'needs_attention') and notified_at is null;

create table if not exists public.akb_class_credits (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  client_id uuid not null references public.akb_clients (id) on delete restrict,
  -- The cancelled booking it came from (one credit each).
  source_booking_id uuid not null unique references public.akb_class_bookings (id) on delete restrict,
  expires_on date not null,
  -- SHA-256 of the single-use credit link.
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  used_booking_id uuid unique references public.akb_class_bookings (id) on delete restrict
);

-- Booking functions raise akb:<rule> for: class_started, class_cancelled,
-- class_full, already_booked, credit_invalid.

-- Cancels places held for payment whose 15 minutes ran out, and the charge of
-- any such booking still unpaid 24 hours later. Returns how many places it released.
create or replace function public.akb_release_class_holds()
returns integer language plpgsql set search_path = public as $$
declare
  n integer := 0;
  b record;
begin
  for b in select k.id, k.attendance_id from public.akb_class_bookings k
           join public.akb_class_attendance a on a.id = k.attendance_id
           where k.status = 'awaiting_payment' and a.hold_expires_at <= now() for update of k loop
    update public.akb_class_attendance set status = 'cancelled', updated_at = now()
      where id = b.attendance_id and status = 'booked' and hold_expires_at <= now();
    update public.akb_class_bookings set status = 'expired', updated_at = now() where id = b.id;
    n := n + 1;
  end loop;
  for b in select k.charge_id from public.akb_class_bookings k
           join public.akb_class_attendance a on a.id = k.attendance_id
           join public.akb_charges c on c.id = k.charge_id
           where k.status = 'expired' and c.voided_at is null and a.hold_expires_at <= now() - interval '24 hours'
             and not exists (select 1 from public.akb_payment_allocations x where x.charge_id = k.charge_id) loop
    perform public.akb_void_charge(b.charge_id, 'Class booking not paid within 24 hours');
  end loop;
  return n;
end $$;

-- Returns {booking_id, charge_id, status}: status 'awaiting_payment' (pay the
-- charge) or 'confirmed' (paid with a credit). The class's start time and
-- length come from the published timetable via the website, never the form.
create or replace function public.akb_create_class_booking(
  p_name text, p_email text, p_phone text,
  p_slot text, p_date date, p_starts_at timestamptz, p_duration integer,
  p_price_pence integer, p_description text,
  p_credit_token_hash text, p_idempotency_key text
) returns jsonb language plpgsql set search_path = public as $$
declare
  k record;
  cr record;
  cid uuid;
  sid uuid;
  att record;
  aid uuid;
  chg uuid;
  bid uuid;
  v_email text := lower(btrim(coalesce(p_email, '')));
begin
  select * into k from public.akb_class_bookings where idempotency_key = p_idempotency_key;
  if found then return jsonb_build_object('booking_id', k.id, 'charge_id', k.charge_id, 'status', k.status); end if;
  if p_starts_at <= now() then raise exception 'akb:class_started' using errcode = 'P0001'; end if;
  perform public.akb_release_class_holds();

  if p_credit_token_hash is not null then
    -- A credit link books for the person the credit belongs to.
    select * into cr from public.akb_class_credits where token_hash = p_credit_token_hash for update;
    if not found or cr.used_booking_id is not null or cr.expires_on < public.akb_london_today() or p_date > cr.expires_on then
      raise exception 'akb:credit_invalid' using errcode = 'P0001';
    end if;
    cid := cr.client_id;
  else
    if v_email = '' then raise exception 'akb:invalid_email' using errcode = 'P0001'; end if;
    select c.id into cid from public.akb_clients c where lower(c.email) = v_email for update;
    if cid is null then
      insert into public.akb_clients (full_name, email, phone, status)
        values (left(btrim(p_name), 100), v_email, left(btrim(coalesce(p_phone, '')), 30), 'lead')
        returning id into cid;
    end if;
  end if;

  sid := public.akb_ensure_class_session(p_slot, p_date, p_starts_at, p_duration);
  select * into att from public.akb_class_attendance where class_session_id = sid and client_id = cid for update;
  if found and att.status in ('booked', 'attended') and (att.hold_expires_at is null or att.hold_expires_at > now()) then
    raise exception 'akb:already_booked' using errcode = 'P0001';
  end if;
  -- The triggers check capacity (class_full) and cancelled classes (class_cancelled).
  if found then
    update public.akb_class_attendance
      set status = 'booked', membership_period_id = null, late_cancel = false, updated_at = now(),
          hold_expires_at = case when p_credit_token_hash is null then now() + interval '15 minutes' end
      where id = att.id;
    aid := att.id;
  else
    insert into public.akb_class_attendance (class_session_id, client_id, hold_expires_at)
      values (sid, cid, case when p_credit_token_hash is null then now() + interval '15 minutes' end)
      returning id into aid;
  end if;

  if p_credit_token_hash is null then
    insert into public.akb_charges (client_id, service, description, amount_pence, due_on)
      values (cid, 'group', left(p_description, 200), p_price_pence, public.akb_london_today())
      returning id into chg;
    insert into public.akb_class_bookings (client_id, attendance_id, charge_id, idempotency_key)
      values (cid, aid, chg, p_idempotency_key) returning id into bid;
  else
    insert into public.akb_class_bookings (client_id, attendance_id, status, idempotency_key)
      values (cid, aid, 'confirmed', p_idempotency_key) returning id into bid;
    update public.akb_class_credits set used_booking_id = bid where id = cr.id;
  end if;
  insert into public.akb_events (client_id, entity, entity_id, action, detail)
    values (cid, 'class_booking', bid, 'created',
            jsonb_build_object('class_date', p_date, 'slot', p_slot, 'charge_id', chg, 'with_credit', p_credit_token_hash is not null));
  return jsonb_build_object('booking_id', bid, 'charge_id', chg,
                            'status', case when p_credit_token_hash is null then 'awaiting_payment' else 'confirmed' end);
end $$;

-- Confirms the place once its charge is fully paid.
create or replace function public.akb_class_booking_on_payment() returns trigger
language plpgsql set search_path = public as $$
declare
  k record;
  owed integer;
begin
  select * into k from public.akb_class_bookings
    where charge_id = new.charge_id and status in ('awaiting_payment', 'expired') for update;
  if not found then return null; end if;
  select outstanding_pence into owed from public.akb_charge_balances where id = new.charge_id;
  if owed > 0 then return null; end if;
  begin
    -- Clearing the hold (or bringing back an expired place) goes through the
    -- capacity and cancelled-class checks.
    update public.akb_class_attendance set status = 'booked', hold_expires_at = null, updated_at = now() where id = k.attendance_id;
    update public.akb_class_bookings set status = 'confirmed', updated_at = now() where id = k.id;
    insert into public.akb_events (client_id, entity, entity_id, action, detail)
      values (k.client_id, 'class_booking', k.id, 'confirmed', jsonb_build_object('paid_online', true));
  exception when others then
    -- Never lose a payment: it stays recorded; Alex sorts out the place.
    update public.akb_class_bookings set status = 'needs_attention', updated_at = now() where id = k.id;
    insert into public.akb_events (client_id, entity, entity_id, action, detail)
      values (k.client_id, 'class_booking', k.id, 'needs_attention', jsonb_build_object('error', left(sqlerrm, 200)));
  end;
  return null;
end $$;

drop trigger if exists akb_payment_allocations_class_booking on public.akb_payment_allocations;
create trigger akb_payment_allocations_class_booking
  after insert or update of amount_pence on public.akb_payment_allocations
  for each row execute function public.akb_class_booking_on_payment();

-- What the booking's private link shows (no personal details beyond the class).
create or replace function public.akb_class_booking_by_token(p_token_hash text)
returns jsonb language sql stable set search_path = public as $$
  select jsonb_build_object(
    'booking_id', k.id, 'status', k.status, 'place_status', a.status,
    'slot', s.slot, 'class_date', s.class_date, 'starts_at', s.starts_at,
    'class_cancelled', s.cancelled_at is not null,
    'can_cancel', k.status = 'confirmed' and a.status = 'booked' and s.starts_at > now(),
    'credit_back_if_cancelled', s.starts_at - now() >= interval '24 hours')
  from public.akb_class_bookings k
  join public.akb_class_attendance a on a.id = k.attendance_id
  join public.akb_class_sessions s on s.id = a.class_session_id
  where k.manage_token_hash = p_token_hash;
$$;

-- Cancels a confirmed booking by its private link. Returns {credit: true}
-- when it was 24 hours or more before the class (a credit with p_credit_token_hash
-- is created, valid for 28 days), {credit: false} when later.
create or replace function public.akb_cancel_class_booking(p_token_hash text, p_credit_token_hash text)
returns jsonb language plpgsql set search_path = public as $$
declare
  k record;
  starts timestamptz;
  in_time boolean;
begin
  select b.*, a.status as place_status into k from public.akb_class_bookings b
    join public.akb_class_attendance a on a.id = b.attendance_id
    where b.manage_token_hash = p_token_hash for update of b;
  if not found then raise exception 'akb:not_found' using errcode = 'P0001'; end if;
  if k.status <> 'confirmed' or k.place_status <> 'booked' then raise exception 'akb:not_booked' using errcode = 'P0001'; end if;
  select s.starts_at into starts from public.akb_class_attendance a join public.akb_class_sessions s on s.id = a.class_session_id where a.id = k.attendance_id;
  if starts <= now() then raise exception 'akb:class_started' using errcode = 'P0001'; end if;
  in_time := starts - now() >= interval '24 hours';
  update public.akb_class_attendance set status = 'cancelled', updated_at = now() where id = k.attendance_id;
  update public.akb_class_bookings set status = 'cancelled', updated_at = now() where id = k.id;
  if in_time then
    insert into public.akb_class_credits (client_id, source_booking_id, expires_on, token_hash)
      values (k.client_id, k.id, public.akb_london_today() + 28, p_credit_token_hash);
  end if;
  insert into public.akb_events (client_id, entity, entity_id, action, detail)
    values (k.client_id, 'class_booking', k.id, 'cancelled_by_booker', jsonb_build_object('credit', in_time));
  return jsonb_build_object('credit', in_time);
end $$;

-- What a credit link shows: whether it can still be used, and until when.
create or replace function public.akb_class_credit_by_token(p_token_hash text)
returns jsonb language sql stable set search_path = public as $$
  select jsonb_build_object('expires_on', c.expires_on,
    'usable', c.used_booking_id is null and c.expires_on >= public.akb_london_today())
  from public.akb_class_credits c where c.token_hash = p_token_hash;
$$;

-- ---------------------------------------------------------------------------
-- Access: server only
-- ---------------------------------------------------------------------------

alter table public.akb_class_bookings enable row level security;
alter table public.akb_class_credits enable row level security;
revoke all on public.akb_class_bookings from anon, authenticated;
revoke all on public.akb_class_credits from anon, authenticated;

do $$
declare
  f record;
begin
  for f in
    select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname in (
      'akb_attendance_capacity', 'akb_release_class_holds', 'akb_create_class_booking', 'akb_class_booking_on_payment',
      'akb_class_booking_by_token', 'akb_cancel_class_booking', 'akb_class_credit_by_token')
  loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
    execute format('grant execute on function %s to service_role', f.sig);
  end loop;
end $$;

notify pgrst, 'reload schema';

commit;
