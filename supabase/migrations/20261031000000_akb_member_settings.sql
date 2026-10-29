-- Account menu features (owner, 2026-10-28): profile and details, sign-in and
-- security (the devices signed in, sign one out), calendar sync (a private
-- subscribe link), and class reminder emails (on or off).
-- Apply to the live project only with the owner's go-ahead (DEPLOYMENT.md).
-- Tests: supabase/tests/20261031000000_akb_member_settings.test.sql.
--
-- Same access model as member accounts (20261027000000): the website's server
-- passes the signed-in client's id taken from the session; every function
-- checks ownership in SQL itself; the new tables have RLS on with no policies
-- and anon/authenticated revoked, so only the server's secret key reaches them.
--
-- What is stored, and why:
-- - akb_member_settings: one on/off setting per client (class reminders;
--   off until they switch it on).
-- - akb_class_reminders: which place has been reminded, so one email each.
-- - akb_member_calendar_feeds: only the SHA-256 hash of the private calendar
--   link, like sign-in links; the link itself is shown once, when made.
-- - akb_member_sessions.device: a short label such as "iPhone, Safari" so a
--   member can tell their devices apart. No IP address and no raw user agent.
--
-- Adds three tables and one column with a default; functions only otherwise.
-- Changes no existing row. Safe to run again.

begin;

alter table public.akb_member_sessions
  add column if not exists device text not null default '' check (char_length(device) <= 60);

create table if not exists public.akb_member_settings (
  client_id uuid primary key references public.akb_clients (id) on delete cascade,
  class_reminders boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.akb_class_reminders (
  attendance_id uuid primary key references public.akb_class_attendance (id) on delete cascade,
  sent_at timestamptz not null default now()
);

create table if not exists public.akb_member_calendar_feeds (
  client_id uuid primary key references public.akb_clients (id) on delete cascade,
  -- SHA-256 of the random token in the private calendar link, as 64 hex characters.
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default now()
);

alter table public.akb_member_settings enable row level security;
alter table public.akb_class_reminders enable row level security;
alter table public.akb_member_calendar_feeds enable row level security;
revoke all on public.akb_member_settings, public.akb_class_reminders, public.akb_member_calendar_feeds from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Profile and settings
-- ---------------------------------------------------------------------------

-- What the settings pages show for this client.
create or replace function public.akb_member_settings_get(p_client uuid)
returns jsonb language sql stable set search_path = public as $$
  select jsonb_build_object(
    'name', c.full_name, 'email', c.email, 'phone', c.phone,
    'class_reminders', coalesce((select s.class_reminders from public.akb_member_settings s where s.client_id = c.id), false),
    'calendar_feed', exists (select 1 from public.akb_member_calendar_feeds f where f.client_id = c.id))
  from public.akb_clients c where c.id = p_client;
$$;

-- Changes the client's own name and phone. The email is how they sign in and
-- how bookings find them, so it changes only through Alex.
create or replace function public.akb_member_update_profile(p_client uuid, p_name text, p_phone text)
returns void language plpgsql set search_path = public as $$
declare
  n text := regexp_replace(btrim(coalesce(p_name, '')), '\s+', ' ', 'g');
  p text := regexp_replace(btrim(coalesce(p_phone, '')), '\s+', ' ', 'g');
begin
  if char_length(n) not between 1 and 100 then raise exception 'akb:invalid_name' using errcode = 'P0001'; end if;
  if char_length(p) > 30 then raise exception 'akb:invalid_phone' using errcode = 'P0001'; end if;
  update public.akb_clients set full_name = n, phone = p, updated_at = now() where id = p_client;
  if not found then raise exception 'akb:not_found' using errcode = 'P0001'; end if;
  insert into public.akb_events (client_id, entity, entity_id, action, detail)
    values (p_client, 'client', p_client, 'profile_updated_by_member', '{}'::jsonb);
end $$;

create or replace function public.akb_member_set_reminders(p_client uuid, p_on boolean)
returns void language plpgsql set search_path = public as $$
begin
  if not exists (select 1 from public.akb_clients where id = p_client) then
    raise exception 'akb:not_found' using errcode = 'P0001';
  end if;
  insert into public.akb_member_settings (client_id, class_reminders) values (p_client, coalesce(p_on, false))
    on conflict (client_id) do update set class_reminders = excluded.class_reminders, updated_at = now();
end $$;

-- ---------------------------------------------------------------------------
-- Devices signed in
-- ---------------------------------------------------------------------------

-- Labels the session just opened (best effort, from the browser's own words).
create or replace function public.akb_member_label_session(p_session_hash text, p_device text)
returns void language sql set search_path = public as $$
  update public.akb_member_sessions set device = left(btrim(coalesce(p_device, '')), 60)
    where session_hash = p_session_hash and ended_at is null;
$$;

-- This client's sessions that are still open, newest use first. 'current' is
-- the one asking. Ids only, never hashes.
create or replace function public.akb_member_sessions_list(p_client uuid, p_current_hash text)
returns jsonb language sql stable set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', s.id, 'device', s.device, 'signed_in_at', s.created_at, 'last_seen_at', s.last_seen_at,
    'current', s.session_hash = p_current_hash) order by (s.session_hash = p_current_hash) desc, s.last_seen_at desc), '[]'::jsonb)
  from public.akb_member_sessions s
  where s.client_id = p_client and s.ended_at is null and s.expires_at > now();
$$;

-- Signs out one other device of this client. Returns false for a session that
-- isn't theirs, is already over, or is the one asking (that is "Sign out").
create or replace function public.akb_member_end_other_session(p_client uuid, p_session uuid, p_current_hash text)
returns boolean language plpgsql set search_path = public as $$
declare
  n integer;
begin
  update public.akb_member_sessions set ended_at = now(), ended_reason = 'signed_out'
    where id = p_session and client_id = p_client and ended_at is null and session_hash <> p_current_hash;
  get diagnostics n = row_count;
  return n > 0;
end $$;

-- ---------------------------------------------------------------------------
-- Calendar link
-- ---------------------------------------------------------------------------

-- Makes (or replaces, so the old link stops working) the client's calendar
-- link, from the hash of a random token the server made.
create or replace function public.akb_member_calendar_set(p_client uuid, p_token_hash text)
returns void language plpgsql set search_path = public as $$
begin
  if not public.akb_can_sign_in(p_client) then raise exception 'akb:not_found' using errcode = 'P0001'; end if;
  insert into public.akb_member_calendar_feeds (client_id, token_hash) values (p_client, p_token_hash)
    on conflict (client_id) do update set token_hash = excluded.token_hash, created_at = now();
end $$;

-- Turns the link off.
create or replace function public.akb_member_calendar_off(p_client uuid)
returns void language sql set search_path = public as $$
  delete from public.akb_member_calendar_feeds where client_id = p_client;
$$;

-- The client a calendar link belongs to, or null (unknown link, or someone who
-- can no longer sign in).
create or replace function public.akb_member_calendar_client(p_token_hash text)
returns uuid language sql stable set search_path = public as $$
  select f.client_id from public.akb_member_calendar_feeds f
  where f.token_hash = p_token_hash and public.akb_can_sign_in(f.client_id);
$$;

-- ---------------------------------------------------------------------------
-- Class reminders
-- ---------------------------------------------------------------------------

-- Booked places on classes that day, still to come, for clients who switched
-- reminders on and haven't been reminded. Held, cancelled and cancelled-class
-- places are left out.
create or replace function public.akb_class_reminders_due(p_date date)
returns jsonb language sql stable set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'attendance_id', a.id, 'name', c.full_name, 'email', c.email,
    'starts_at', s.starts_at, 'slot', s.slot) order by s.starts_at, c.full_name), '[]'::jsonb)
  from public.akb_class_attendance a
  join public.akb_class_sessions s on s.id = a.class_session_id
  join public.akb_clients c on c.id = a.client_id
  join public.akb_member_settings m on m.client_id = c.id and m.class_reminders
  where s.class_date = p_date and s.cancelled_at is null and s.starts_at > now()
    and a.status = 'booked' and a.hold_expires_at is null and c.email <> ''
    and not exists (select 1 from public.akb_class_reminders r where r.attendance_id = a.id);
$$;

create or replace function public.akb_class_reminder_sent(p_attendance uuid)
returns void language sql set search_path = public as $$
  insert into public.akb_class_reminders (attendance_id) values (p_attendance) on conflict do nothing;
$$;

-- Reminder records go with the clean-up of old sessions.
create or replace function public.akb_member_cleanup()
returns integer language plpgsql set search_path = public as $$
declare
  a integer;
  b integer;
  c integer;
begin
  delete from public.akb_member_login_links where created_at < now() - interval '1 day';
  get diagnostics a = row_count;
  delete from public.akb_member_sessions
    where coalesce(ended_at, expires_at) < now() - interval '30 days';
  get diagnostics b = row_count;
  delete from public.akb_class_reminders where sent_at < now() - interval '60 days';
  get diagnostics c = row_count;
  return a + b + c;
end $$;

-- ---------------------------------------------------------------------------
-- Access: server only, like every other akb_ table and function
-- ---------------------------------------------------------------------------

do $$
declare
  f record;
begin
  for f in
    select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname in (
      'akb_member_settings_get', 'akb_member_update_profile', 'akb_member_set_reminders',
      'akb_member_label_session', 'akb_member_sessions_list', 'akb_member_end_other_session',
      'akb_member_calendar_set', 'akb_member_calendar_off', 'akb_member_calendar_client',
      'akb_class_reminders_due', 'akb_class_reminder_sent', 'akb_member_cleanup')
  loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
    execute format('grant execute on function %s to service_role', f.sig);
  end loop;
end $$;

notify pgrst, 'reload schema';

commit;
