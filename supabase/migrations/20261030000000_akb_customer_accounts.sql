-- Accounts for everyone who has paid, not only members (owner, 2026-10-28:
-- "the standard gym flow": the first paid booking makes the account; no
-- passwords, no separate sign-up). Apply to the live project only with the
-- owner's go-ahead (DEPLOYMENT.md), after 20261029000000.
-- Tests: supabase/tests/20261030000000_akb_customer_accounts.test.sql.
--
-- What changes:
-- 1. Who can sign in (akb_can_sign_in): a member, as before, or anyone who has
--    paid for something: a class booked and paid online (or with a class
--    credit), or any payment Alex recorded for them. A booking that was never
--    paid gives no account. The sign-in functions use it in place of
--    akb_is_member; booking with membership credits still needs a membership.
-- 2. akb_member_overview also returns, for everyone: their details (to fill
--    in the booking form), every place (pay-as-you-go ones too, saying how
--    each was paid), their unused class credits, and how many classes they
--    paid for singly in the 4 weeks around today (for "save with a membership").
--    Places still held for payment are left out.
-- 3. From the account: cancel a paid booking (24 hours or more before: a class
--    credit, as with the emailed link), and book a class with a class credit.
--    Both check in SQL that the place or credit is the signed-in client's.
--
-- Replaces five functions; adds three. Changes no table and no row. Server only.

begin;

-- ---------------------------------------------------------------------------
-- Who can sign in
-- ---------------------------------------------------------------------------

create or replace function public.akb_can_sign_in(p_client uuid)
returns boolean language sql stable set search_path = public as $$
  select public.akb_is_member(p_client)
    or exists (select 1 from public.akb_memberships m where m.client_id = p_client)
    -- Confirmed (paid, or with a credit), or cancelled after it was confirmed, or paid but needing Alex.
    or exists (select 1 from public.akb_class_bookings k
               where k.client_id = p_client and k.status in ('confirmed', 'cancelled', 'needs_attention'))
    or exists (select 1 from public.akb_payments p where p.client_id = p_client and p.status = 'received');
$$;

create or replace function public.akb_member_create_login_link(p_email text, p_token_hash text)
returns boolean language plpgsql set search_path = public as $$
declare
  cid uuid;
  recent integer;
begin
  select c.id into cid from public.akb_clients c
    where c.email <> '' and lower(c.email) = lower(btrim(p_email));
  if cid is null or not public.akb_can_sign_in(cid) then return false; end if;
  select count(*) into recent from public.akb_member_login_links
    where client_id = cid and created_at > now() - interval '1 hour';
  if recent >= 5 then return false; end if;
  insert into public.akb_member_login_links (client_id, token_hash, expires_at)
    values (cid, p_token_hash, now() + interval '15 minutes');
  return true;
end $$;

create or replace function public.akb_member_redeem_login_link(p_token_hash text, p_session_hash text)
returns uuid language plpgsql set search_path = public as $$
declare
  cid uuid;
begin
  update public.akb_member_login_links set used_at = now()
    where token_hash = p_token_hash and used_at is null and expires_at > now()
    returning client_id into cid;
  if cid is null or not public.akb_can_sign_in(cid) then return null; end if;
  insert into public.akb_member_sessions (client_id, session_hash, expires_at)
    values (cid, p_session_hash, now() + interval '30 days');
  insert into public.akb_events (client_id, entity, entity_id, action, detail)
    values (cid, 'member_session', null, 'signed_in', '{}'::jsonb);
  return cid;
end $$;

create or replace function public.akb_member_session_client(p_session_hash text)
returns uuid language plpgsql set search_path = public as $$
declare
  s record;
begin
  select * into s from public.akb_member_sessions
    where session_hash = p_session_hash and ended_at is null and expires_at > now();
  if not found then return null; end if;
  if not public.akb_can_sign_in(s.client_id) then
    update public.akb_member_sessions set ended_at = now(), ended_reason = 'no_membership' where id = s.id;
    return null;
  end if;
  if s.last_seen_at < now() - interval '5 minutes' then
    update public.akb_member_sessions set last_seen_at = now() where id = s.id;
  end if;
  return s.client_id;
end $$;

-- ---------------------------------------------------------------------------
-- What the account shows
-- ---------------------------------------------------------------------------

-- Everything the account page shows, for this client only. 'how' says how a
-- place was paid: 'credit' (membership credit), 'paid' (booked and paid
-- online), 'class_credit' (a class credit), 'other' (arranged with Alex).
-- can_cancel: the client can cancel it here (membership-credit places and
-- online bookings, before the class starts).
create or replace function public.akb_member_overview(p_client uuid)
returns jsonb language plpgsql stable set search_path = public as $$
declare
  today date := public.akb_london_today();
  c record;
  m record;
  has_m boolean;
  period jsonb;
begin
  select full_name, email, phone into c from public.akb_clients where id = p_client;
  select * into m from public.akb_memberships
    where client_id = p_client order by (status in ('active', 'paused')) desc, start_on desc limit 1;
  has_m := found;
  if has_m then
    select jsonb_build_object('start', b.period_start, 'end', b.period_end, 'credits', b.credits,
                              'used', b.credits_used, 'left', b.credits_left) into period
      from public.akb_membership_period_balances b
      where b.membership_id = m.id and today between b.period_start and b.period_end;
  end if;
  return jsonb_build_object(
    'client', jsonb_build_object('name', c.full_name, 'email', c.email, 'phone', c.phone),
    'membership', case when not has_m then null else jsonb_build_object(
      'plan', m.plan, 'plan_name', m.plan_name, 'status', m.status, 'price_pence', m.price_pence,
      'credits', m.credits, 'start_on', m.start_on, 'cancelled_on', m.cancelled_on,
      -- Renews on this date while active; null when paused or cancelled.
      'renews_on', case when m.status = 'active' then m.next_period_on end) end,
    'period', period,
    'places', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', a.id, 'class_date', s.class_date, 'starts_at', s.starts_at, 'slot', s.slot,
        'status', a.status, 'late_cancel', a.late_cancel, 'with_credit', a.membership_period_id is not null,
        'how', case when a.membership_period_id is not null then 'credit'
                    when k.id is not null and k.charge_id is not null then 'paid'
                    when k.id is not null then 'class_credit'
                    else 'other' end,
        'class_cancelled', s.cancelled_at is not null,
        'can_cancel', a.status = 'booked' and s.starts_at > now()
                      and (a.membership_period_id is not null or k.status = 'confirmed'),
        'credit_back_if_cancelled', s.starts_at - now() >= interval '24 hours')
        order by s.starts_at)
      from public.akb_class_attendance a
      join public.akb_class_sessions s on s.id = a.class_session_id
      -- The booking that made this place, if it was booked online (the latest one: a place can be re-booked).
      left join lateral (select b.id, b.charge_id, b.status from public.akb_class_bookings b
                         where b.attendance_id = a.id order by b.created_at desc limit 1) k on true
      where a.client_id = p_client and s.class_date >= today - 28 and a.hold_expires_at is null), '[]'::jsonb),
    'class_credits', coalesce((
      select jsonb_agg(jsonb_build_object('id', cr.id, 'expires_on', cr.expires_on) order by cr.expires_on)
      from public.akb_class_credits cr
      where cr.client_id = p_client and cr.used_booking_id is null and cr.expires_on >= today), '[]'::jsonb),
    -- Classes paid for singly online in the 4 weeks around today (14 days back, 13 ahead), still booked or attended.
    'paid_classes_28d', (
      select count(*) from public.akb_class_bookings k
      join public.akb_class_attendance a on a.id = k.attendance_id
      join public.akb_class_sessions s on s.id = a.class_session_id
      where k.client_id = p_client and k.charge_id is not null and k.status = 'confirmed'
        and a.status in ('booked', 'attended') and s.class_date between today - 14 and today + 13));
end $$;

-- ---------------------------------------------------------------------------
-- Cancelling a paid booking and booking with a class credit, from the account
-- ---------------------------------------------------------------------------

-- Cancels one of the client's own online bookings, by its place. Same rules
-- as the emailed link (akb_cancel_class_booking): 24 hours or more before, a
-- class credit valid for 28 days (p_credit_token_hash); later, nothing back.
-- Returns {credit: boolean}.
create or replace function public.akb_member_cancel_booking(p_client uuid, p_attendance uuid, p_credit_token_hash text)
returns jsonb language plpgsql set search_path = public as $$
declare
  k record;
  in_time boolean;
begin
  select b.*, a.status as place_status, s.starts_at into k from public.akb_class_bookings b
    join public.akb_class_attendance a on a.id = b.attendance_id
    join public.akb_class_sessions s on s.id = a.class_session_id
    where b.attendance_id = p_attendance and b.client_id = p_client and a.client_id = p_client
    order by b.created_at desc limit 1
    for update of b;
  if not found then raise exception 'akb:not_found' using errcode = 'P0001'; end if;
  if k.status <> 'confirmed' or k.place_status <> 'booked' then raise exception 'akb:not_booked' using errcode = 'P0001'; end if;
  if k.starts_at <= now() then raise exception 'akb:class_started' using errcode = 'P0001'; end if;
  in_time := k.starts_at - now() >= interval '24 hours';
  update public.akb_class_attendance set status = 'cancelled', updated_at = now() where id = k.attendance_id;
  update public.akb_class_bookings set status = 'cancelled', updated_at = now() where id = k.id;
  if in_time then
    insert into public.akb_class_credits (client_id, source_booking_id, expires_on, token_hash)
      values (k.client_id, k.id, public.akb_london_today() + 28, p_credit_token_hash);
  end if;
  insert into public.akb_events (client_id, entity, entity_id, action, detail)
    values (k.client_id, 'class_booking', k.id, 'cancelled_by_member', jsonb_build_object('credit', in_time));
  return jsonb_build_object('credit', in_time);
end $$;

-- Books a class with one of the client's own class credits (the same booking
-- as a credit link: akb_create_class_booking, confirmed at once, nothing to
-- pay). Returns {booking_id, charge_id, status}.
create or replace function public.akb_member_book_with_class_credit(
  p_client uuid, p_credit uuid, p_slot text, p_date date, p_starts_at timestamptz, p_duration integer, p_idempotency_key text
) returns jsonb language plpgsql set search_path = public as $$
declare
  th text;
begin
  select token_hash into th from public.akb_class_credits where id = p_credit and client_id = p_client;
  if th is null then raise exception 'akb:credit_invalid' using errcode = 'P0001'; end if;
  return public.akb_create_class_booking('', '', '', p_slot, p_date, p_starts_at, p_duration, 0, '', th, p_idempotency_key);
end $$;

-- ---------------------------------------------------------------------------
-- Access: server only
-- ---------------------------------------------------------------------------

do $$
declare
  f record;
begin
  for f in
    select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname in (
      'akb_can_sign_in', 'akb_member_create_login_link', 'akb_member_redeem_login_link', 'akb_member_session_client',
      'akb_member_overview', 'akb_member_cancel_booking', 'akb_member_book_with_class_credit')
  loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
    execute format('grant execute on function %s to service_role', f.sig);
  end loop;
end $$;

notify pgrst, 'reload schema';

commit;
