-- DRAFT FOR REVIEW: not applied anywhere. Lives outside supabase/migrations/
-- so the CLI never runs it. Move it into supabase/migrations/ only once the
-- owner has approved docs/MEMBER_ACCOUNTS_DRAFT.md.
--
-- Member accounts (stage 2 of memberships; owner's choice, 2026-10-26):
-- members sign in with a one-time link sent to the email on their client
-- record, then see their plan, credits and renewal date, and book or cancel
-- classes with their credits.
--
-- How access works (same model as everything else in this project):
-- - Members never get database credentials. There are no Supabase Auth users
--   for members and no new database roles. The website's server signs a
--   member in, keeps a session, and calls the functions below with the
--   service key, passing the member's client id taken from that session.
-- - Every new table has RLS on with no policies, and anon/authenticated are
--   revoked, exactly like the existing akb_ tables: nothing but the server
--   can read or write them.
-- - Every member function takes the client id and checks ownership in SQL
--   itself, so even a server bug passing someone else's place id is refused.
-- - Sign-in links and sessions are stored only as SHA-256 hashes: the
--   database never holds a usable link or session.
--
-- The credit rules are the existing ones (akb_attendance_credit_rules,
-- akb_attendance_capacity, akb_class_not_cancelled): this adds no new way
-- round them. Adds two tables and functions only; changes no existing table
-- or row. Safe to run again.

begin;

-- ---------------------------------------------------------------------------
-- Sign-in links and sessions
-- ---------------------------------------------------------------------------

create table if not exists public.akb_member_login_links (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  client_id uuid not null references public.akb_clients (id) on delete cascade,
  -- SHA-256 of the random token in the emailed link, as 64 hex characters.
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  expires_at timestamptz not null,
  used_at timestamptz,
  check (expires_at > created_at)
);
create index if not exists akb_member_login_links_client_idx on public.akb_member_login_links (client_id, created_at desc);

create table if not exists public.akb_member_sessions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  client_id uuid not null references public.akb_clients (id) on delete cascade,
  -- SHA-256 of the random value in the member's cookie.
  session_hash text not null unique check (session_hash ~ '^[0-9a-f]{64}$'),
  expires_at timestamptz not null,
  last_seen_at timestamptz not null default now(),
  ended_at timestamptz,
  ended_reason text check (ended_reason in ('signed_out', 'signed_out_everywhere', 'coach', 'no_membership')),
  check ((ended_at is null) = (ended_reason is null))
);
create index if not exists akb_member_sessions_client_idx on public.akb_member_sessions (client_id) where ended_at is null;

-- ---------------------------------------------------------------------------
-- Who can sign in
-- ---------------------------------------------------------------------------

-- Today in the UK, whatever the database's time zone.
create or replace function public.akb_london_today()
returns date language sql stable set search_path = public as $$
  select (now() at time zone 'Europe/London')::date;
$$;

-- A member is a client with a current membership (active or paused), or a
-- cancelled one whose last period hasn't ended (their credits are still usable).
create or replace function public.akb_is_member(p_client uuid)
returns boolean language sql stable set search_path = public as $$
  select exists (
    select 1 from public.akb_memberships m
    where m.client_id = p_client
      and (m.status in ('active', 'paused')
           or exists (select 1 from public.akb_membership_periods p
                      where p.membership_id = m.id and p.period_end >= public.akb_london_today()))
  );
$$;

-- Creates a one-time sign-in link for the member with this email. Returns
-- false (and creates nothing) for an address that isn't a member's, or after
-- 5 links in the last hour. The website shows the same message either way,
-- so the form can't be used to find out who is a member.
create or replace function public.akb_member_create_login_link(p_email text, p_token_hash text)
returns boolean language plpgsql set search_path = public as $$
declare
  cid uuid;
  recent integer;
begin
  select c.id into cid from public.akb_clients c
    where c.email <> '' and lower(c.email) = lower(btrim(p_email));
  if cid is null or not public.akb_is_member(cid) then return false; end if;
  select count(*) into recent from public.akb_member_login_links
    where client_id = cid and created_at > now() - interval '1 hour';
  if recent >= 5 then return false; end if;
  insert into public.akb_member_login_links (client_id, token_hash, expires_at)
    values (cid, p_token_hash, now() + interval '15 minutes');
  return true;
end $$;

-- Uses a sign-in link (once, within 15 minutes) and opens a 30-day session.
-- Returns the client id, or null if the link is unknown, used, expired, or
-- its owner is no longer a member.
create or replace function public.akb_member_redeem_login_link(p_token_hash text, p_session_hash text)
returns uuid language plpgsql set search_path = public as $$
declare
  cid uuid;
begin
  update public.akb_member_login_links set used_at = now()
    where token_hash = p_token_hash and used_at is null and expires_at > now()
    returning client_id into cid;
  if cid is null or not public.akb_is_member(cid) then return null; end if;
  insert into public.akb_member_sessions (client_id, session_hash, expires_at)
    values (cid, p_session_hash, now() + interval '30 days');
  insert into public.akb_events (client_id, entity, entity_id, action, detail)
    values (cid, 'member_session', null, 'signed_in', '{}'::jsonb);
  return cid;
end $$;

-- The client signed in with this session, or null. Ends the session if its
-- owner is no longer a member. Notes when it was last used (at most every 5 minutes).
create or replace function public.akb_member_session_client(p_session_hash text)
returns uuid language plpgsql set search_path = public as $$
declare
  s record;
begin
  select * into s from public.akb_member_sessions
    where session_hash = p_session_hash and ended_at is null and expires_at > now();
  if not found then return null; end if;
  if not public.akb_is_member(s.client_id) then
    update public.akb_member_sessions set ended_at = now(), ended_reason = 'no_membership' where id = s.id;
    return null;
  end if;
  if s.last_seen_at < now() - interval '5 minutes' then
    update public.akb_member_sessions set last_seen_at = now() where id = s.id;
  end if;
  return s.client_id;
end $$;

-- Signs out this session, or (p_everywhere) every session of its member.
create or replace function public.akb_member_sign_out(p_session_hash text, p_everywhere boolean default false)
returns void language plpgsql set search_path = public as $$
declare
  cid uuid;
begin
  select client_id into cid from public.akb_member_sessions where session_hash = p_session_hash and ended_at is null;
  if cid is null then return; end if;
  if p_everywhere then
    update public.akb_member_sessions set ended_at = now(), ended_reason = 'signed_out_everywhere'
      where client_id = cid and ended_at is null;
  else
    update public.akb_member_sessions set ended_at = now(), ended_reason = 'signed_out'
      where session_hash = p_session_hash and ended_at is null;
  end if;
end $$;

-- For the coach area: sign a member out of every device.
create or replace function public.akb_member_end_sessions(p_client uuid)
returns integer language plpgsql set search_path = public as $$
declare
  n integer;
begin
  update public.akb_member_sessions set ended_at = now(), ended_reason = 'coach'
    where client_id = p_client and ended_at is null;
  get diagnostics n = row_count;
  return n;
end $$;

-- ---------------------------------------------------------------------------
-- What a member sees and does
-- ---------------------------------------------------------------------------

-- Everything the account page shows, for this member only: the current
-- membership, the period covering today with its credits, and their class
-- places from 28 days ago onwards. Each upcoming credit-paid place says
-- whether cancelling now would return the credit (24 hours or more before).
create or replace function public.akb_member_overview(p_client uuid)
returns jsonb language plpgsql stable set search_path = public as $$
declare
  today date := public.akb_london_today();
  m record;
  per record;
begin
  select * into m from public.akb_memberships
    where client_id = p_client order by (status in ('active', 'paused')) desc, start_on desc limit 1;
  if not found then return jsonb_build_object('membership', null, 'period', null, 'places', '[]'::jsonb); end if;
  select b.period_start, b.period_end, b.credits, b.credits_used, b.credits_left into per
    from public.akb_membership_period_balances b
    where b.membership_id = m.id and today between b.period_start and b.period_end;
  return jsonb_build_object(
    'membership', jsonb_build_object(
      'plan', m.plan, 'plan_name', m.plan_name, 'status', m.status, 'price_pence', m.price_pence,
      'credits', m.credits, 'start_on', m.start_on, 'cancelled_on', m.cancelled_on,
      -- Renews on this date while active; null when paused or cancelled.
      'renews_on', case when m.status = 'active' then m.next_period_on end),
    'period', case when per.period_start is null then null else jsonb_build_object(
      'start', per.period_start, 'end', per.period_end, 'credits', per.credits,
      'used', per.credits_used, 'left', per.credits_left) end,
    'places', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', a.id, 'class_date', s.class_date, 'starts_at', s.starts_at, 'slot', s.slot,
        'status', a.status, 'late_cancel', a.late_cancel, 'with_credit', a.membership_period_id is not null,
        'class_cancelled', s.cancelled_at is not null,
        'can_cancel', a.status = 'booked' and a.membership_period_id is not null and s.starts_at > now(),
        'credit_back_if_cancelled', s.starts_at - now() >= interval '24 hours')
        order by s.starts_at)
      from public.akb_class_attendance a join public.akb_class_sessions s on s.id = a.class_session_id
      where a.client_id = p_client and s.class_date >= today - 28), '[]'::jsonb));
end $$;

-- Books a class with a credit from the member's period covering the class
-- date. The server passes the slot, date and start time from the published
-- timetable, never from the browser. Errors say why it can't (akb:...):
-- class_started, no_membership (no period covers that date yet: credits are
-- only for the current period), already_booked, and from the existing
-- triggers class_full, class_cancelled and no_credits.
create or replace function public.akb_member_book_class(
  p_client uuid, p_slot text, p_date date, p_starts_at timestamptz, p_duration integer
) returns uuid language plpgsql set search_path = public as $$
declare
  pid uuid;
  sid uuid;
  a record;
  aid uuid;
begin
  if not public.akb_is_member(p_client) then raise exception 'akb:no_membership' using errcode = 'P0001'; end if;
  if p_starts_at <= now() then raise exception 'akb:class_started' using errcode = 'P0001'; end if;
  select p.id into pid from public.akb_membership_periods p
    join public.akb_memberships m on m.id = p.membership_id
    where m.client_id = p_client and p_date between p.period_start and p.period_end
    order by p.period_start desc limit 1;
  if pid is null then raise exception 'akb:no_membership' using errcode = 'P0001'; end if;
  sid := public.akb_ensure_class_session(p_slot, p_date, p_starts_at, p_duration);
  select * into a from public.akb_class_attendance where class_session_id = sid and client_id = p_client for update;
  if found then
    if a.status <> 'cancelled' then raise exception 'akb:already_booked' using errcode = 'P0001'; end if;
    -- Re-booking a place they cancelled: one place per person per class, so the old row comes back.
    update public.akb_class_attendance
      set status = 'booked', membership_period_id = pid, late_cancel = false, updated_at = now()
      where id = a.id;
    aid := a.id;
  else
    insert into public.akb_class_attendance (class_session_id, client_id, membership_period_id)
      values (sid, p_client, pid) returning id into aid;
  end if;
  insert into public.akb_events (client_id, entity, entity_id, action, detail)
    values (p_client, 'attendance', aid, 'booked_by_member', jsonb_build_object('class_date', p_date, 'slot', p_slot, 'period_id', pid));
  return aid;
end $$;

-- Cancels one of the member's own credit-paid places before the class starts.
-- Returns true if it was late (under 24 hours before: the credit is used, as
-- the policy says); the existing trigger decides. Places paid another way are
-- cancelled by Alex, as now.
create or replace function public.akb_member_cancel_place(p_client uuid, p_attendance uuid)
returns boolean language plpgsql set search_path = public as $$
declare
  a record;
  late boolean;
begin
  select att.*, s.starts_at into a from public.akb_class_attendance att
    join public.akb_class_sessions s on s.id = att.class_session_id
    where att.id = p_attendance and att.client_id = p_client
    for update of att;
  if not found then raise exception 'akb:not_found' using errcode = 'P0001'; end if;
  if a.status <> 'booked' then raise exception 'akb:not_booked' using errcode = 'P0001'; end if;
  if a.membership_period_id is null then raise exception 'akb:not_credit_place' using errcode = 'P0001'; end if;
  if a.starts_at <= now() then raise exception 'akb:class_started' using errcode = 'P0001'; end if;
  perform public.akb_set_attendance(p_attendance, 'cancelled');
  select late_cancel into late from public.akb_class_attendance where id = p_attendance;
  insert into public.akb_events (client_id, entity, entity_id, action, detail)
    values (p_client, 'attendance', p_attendance, 'cancelled_by_member', jsonb_build_object('late', late));
  return late;
end $$;

-- ---------------------------------------------------------------------------
-- Housekeeping (daily cron): links are deleted a day after they were made,
-- sessions 30 days after they ended or expired.
-- ---------------------------------------------------------------------------

create or replace function public.akb_member_cleanup()
returns integer language plpgsql set search_path = public as $$
declare
  a integer;
  b integer;
begin
  delete from public.akb_member_login_links where created_at < now() - interval '1 day';
  get diagnostics a = row_count;
  delete from public.akb_member_sessions
    where coalesce(ended_at, expires_at) < now() - interval '30 days';
  get diagnostics b = row_count;
  return a + b;
end $$;

-- ---------------------------------------------------------------------------
-- Access: server only, like every other akb_ table and function
-- ---------------------------------------------------------------------------

alter table public.akb_member_login_links enable row level security;
alter table public.akb_member_sessions enable row level security;
revoke all on public.akb_member_login_links from public, anon, authenticated;
revoke all on public.akb_member_sessions from public, anon, authenticated;

do $$
declare
  f record;
begin
  for f in
    select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname in (
      'akb_london_today', 'akb_is_member', 'akb_member_create_login_link', 'akb_member_redeem_login_link',
      'akb_member_session_client', 'akb_member_sign_out', 'akb_member_end_sessions', 'akb_member_overview',
      'akb_member_book_class', 'akb_member_cancel_place', 'akb_member_cleanup')
  loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
    execute format('grant execute on function %s to service_role', f.sig);
  end loop;
end $$;

notify pgrst, 'reload schema';

commit;
