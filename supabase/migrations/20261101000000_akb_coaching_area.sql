-- Raeng Coaching, the member side of online coaching (owner's members design,
-- 2026-10-28: the coaching area in the members app). A member with an active
-- online coaching subscription (akb_subscriptions, started by Alex in the coach
-- area) gets their programme, logs each session set by set, sends a weekly
-- check-in and messages Alex; Alex writes the programme and replies in the
-- coach area. Apply to the live project only with the owner's go-ahead
-- (DEPLOYMENT.md). Tests: src/lib/coach/coaching.test.ts.
--
-- Same access model as member accounts (20261027000000): the website's server
-- passes the signed-in client's id taken from the session; every member
-- function finds the client's own active subscription itself, so a member can
-- only ever read or write their own coaching. The new tables have RLS on with
-- no policies and anon/authenticated revoked: only the server's secret key
-- reaches them. Demo videos are links only (https), never uploaded.
--
-- Also: akb_can_sign_in now includes an active coaching subscription, so an
-- online-coaching client who has never booked a class can sign in.
--
-- Adds six tables and functions; replaces akb_can_sign_in; changes no existing
-- row. Safe to run again.

begin;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.akb_coaching_programmes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  subscription_id uuid not null references public.akb_subscriptions (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  goal text not null default '' check (char_length(goal) <= 200),
  weeks integer not null check (weeks between 1 and 12),
  days_per_week integer not null default 3 check (days_per_week between 1 and 7),
  starts_on date not null,
  active boolean not null default true
);
-- One live programme per subscription.
create unique index if not exists akb_coaching_programmes_active_key on public.akb_coaching_programmes (subscription_id) where active;

create table if not exists public.akb_coaching_items (
  id uuid primary key default gen_random_uuid(),
  programme_id uuid not null references public.akb_coaching_programmes (id) on delete cascade,
  week integer not null check (week between 1 and 12),
  day text not null check (char_length(btrim(day)) between 1 and 20),
  position integer not null check (position between 1 and 40),
  name text not null check (char_length(btrim(name)) between 1 and 80),
  sets integer not null check (sets between 1 and 20),
  reps text not null default '' check (char_length(reps) <= 20),
  load text not null default '' check (char_length(load) <= 20),
  note text not null default '' check (char_length(note) <= 200),
  -- A link to a demo hosted elsewhere (YouTube, Vimeo, Drive...). Never a file.
  video_url text check (video_url is null or (char_length(video_url) <= 500 and video_url ~* '^https://[^\s]+\.[^\s]+$')),
  unique (programme_id, week, day, position)
);

create table if not exists public.akb_coaching_logs (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.akb_subscriptions (id) on delete cascade,
  programme_id uuid not null references public.akb_coaching_programmes (id) on delete cascade,
  week integer not null check (week between 1 and 12),
  day text not null check (char_length(btrim(day)) between 1 and 20),
  note text not null default '' check (char_length(note) <= 500),
  logged_at timestamptz not null default now(),
  -- Logging a day again replaces it: one log per day of the programme.
  unique (programme_id, week, day)
);
create index if not exists akb_coaching_logs_subscription_idx on public.akb_coaching_logs (subscription_id, logged_at desc);

create table if not exists public.akb_coaching_set_logs (
  id bigint generated always as identity primary key,
  log_id uuid not null references public.akb_coaching_logs (id) on delete cascade,
  -- Kept by name too, so a rewritten programme doesn't erase what was logged.
  item_id uuid references public.akb_coaching_items (id) on delete set null,
  item_name text not null check (char_length(item_name) between 1 and 80),
  position integer not null,
  set_no integer not null check (set_no between 1 and 20),
  load text not null default '' check (char_length(load) <= 20),
  reps text not null default '' check (char_length(reps) <= 20),
  done boolean not null default false
);
create index if not exists akb_coaching_set_logs_log_idx on public.akb_coaching_set_logs (log_id);

create table if not exists public.akb_coaching_check_ins (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  subscription_id uuid not null references public.akb_subscriptions (id) on delete cascade,
  -- The Monday of the (UK) week it was sent in: one check-in a week.
  week_of date not null,
  programme_week integer check (programme_week between 1 and 12),
  energy integer not null check (energy between 1 and 5),
  sleep integer not null check (sleep between 1 and 5),
  training integer not null check (training between 1 and 5),
  wins text not null default '' check (char_length(wins) <= 1000),
  struggles text not null default '' check (char_length(struggles) <= 1000),
  video_url text check (video_url is null or (char_length(video_url) <= 500 and video_url ~* '^https?://[^\s]+\.[^\s]+$')),
  coach_reply text check (coach_reply is null or char_length(coach_reply) <= 1000),
  replied_at timestamptz,
  unique (subscription_id, week_of)
);

create table if not exists public.akb_coaching_messages (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  subscription_id uuid not null references public.akb_subscriptions (id) on delete cascade,
  from_client boolean not null,
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  read_at timestamptz
);
create index if not exists akb_coaching_messages_subscription_idx on public.akb_coaching_messages (subscription_id, id);

alter table public.akb_coaching_programmes enable row level security;
alter table public.akb_coaching_items enable row level security;
alter table public.akb_coaching_logs enable row level security;
alter table public.akb_coaching_set_logs enable row level security;
alter table public.akb_coaching_check_ins enable row level security;
alter table public.akb_coaching_messages enable row level security;
revoke all on public.akb_coaching_programmes, public.akb_coaching_items, public.akb_coaching_logs,
  public.akb_coaching_set_logs, public.akb_coaching_check_ins, public.akb_coaching_messages from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Who has coaching, and which week they're on
-- ---------------------------------------------------------------------------

-- The client's active online coaching subscription, or null.
create or replace function public.akb_coaching_subscription(p_client uuid)
returns uuid language sql stable set search_path = public as $$
  select s.id from public.akb_subscriptions s
  where s.client_id = p_client and s.status = 'active'
  order by s.start_on desc limit 1;
$$;

-- Programme week today (UK), from 1 to its length.
create or replace function public.akb_coaching_week(p_starts_on date, p_weeks integer)
returns integer language sql stable set search_path = public as $$
  select least(p_weeks, greatest(1, (public.akb_london_today() - p_starts_on) / 7 + 1));
$$;

-- Online coaching clients can sign in too (they may never have booked a class).
create or replace function public.akb_can_sign_in(p_client uuid)
returns boolean language sql stable set search_path = public as $$
  select public.akb_is_member(p_client)
    or exists (select 1 from public.akb_memberships m where m.client_id = p_client)
    or exists (select 1 from public.akb_class_bookings k
               where k.client_id = p_client and k.status in ('confirmed', 'cancelled', 'needs_attention'))
    or exists (select 1 from public.akb_payments p where p.client_id = p_client and p.status = 'received')
    or public.akb_coaching_subscription(p_client) is not null;
$$;

-- ---------------------------------------------------------------------------
-- What the member and the coach see
-- ---------------------------------------------------------------------------

-- The small version, for the card on Home, the menu and the Plan tab.
create or replace function public.akb_coaching_status(p_client uuid)
returns jsonb language plpgsql stable set search_path = public as $$
declare
  sub record;
  prog record;
begin
  select s.* into sub from public.akb_subscriptions s where s.id = public.akb_coaching_subscription(p_client);
  if not found then return jsonb_build_object('active', false); end if;
  select * into prog from public.akb_coaching_programmes where subscription_id = sub.id and active;
  return jsonb_build_object(
    'active', true, 'plan', sub.plan, 'price_pence', sub.price_pence,
    'programme', case when prog.id is null then null else jsonb_build_object(
      'name', prog.name, 'weeks', prog.weeks, 'days_per_week', prog.days_per_week,
      'week', public.akb_coaching_week(prog.starts_on, prog.weeks)) end,
    'unread', (select count(*) from public.akb_coaching_messages m where m.subscription_id = sub.id and not m.from_client and m.read_at is null),
    'check_in_sent', exists (select 1 from public.akb_coaching_check_ins c where c.subscription_id = sub.id
                             and c.week_of = date_trunc('week', public.akb_london_today())::date));
end $$;

-- Everything the coaching area shows, for one subscription (the coach's view
-- and, through akb_coaching_overview, the member's).
create or replace function public.akb_coaching_overview_sub(p_sub uuid)
returns jsonb language plpgsql stable set search_path = public as $$
declare
  sub record;
  prog record;
  cur integer;
begin
  select s.* into sub from public.akb_subscriptions s where s.id = p_sub;
  if not found then return jsonb_build_object('active', false); end if;
  select * into prog from public.akb_coaching_programmes where subscription_id = sub.id and active;
  if found then cur := public.akb_coaching_week(prog.starts_on, prog.weeks); end if;
  return jsonb_build_object(
    'active', true,
    'subscription', jsonb_build_object('id', sub.id, 'plan', sub.plan, 'price_pence', sub.price_pence, 'start_on', sub.start_on, 'status', sub.status),
    'today', public.akb_london_today(),
    'week_of', date_trunc('week', public.akb_london_today())::date,
    'programme', case when prog.id is null then null else jsonb_build_object(
      'id', prog.id, 'name', prog.name, 'goal', prog.goal, 'weeks', prog.weeks, 'days_per_week', prog.days_per_week,
      'starts_on', prog.starts_on, 'week', cur,
      'items', coalesce((select jsonb_agg(jsonb_build_object(
          'id', i.id, 'week', i.week, 'day', i.day, 'position', i.position, 'name', i.name, 'sets', i.sets,
          'reps', i.reps, 'load', i.load, 'note', i.note, 'video_url', i.video_url) order by i.week, i.day, i.position)
        from public.akb_coaching_items i where i.programme_id = prog.id), '[]'::jsonb)) end,
    'logs', coalesce((select jsonb_agg(jsonb_build_object(
        'id', l.id, 'week', l.week, 'day', l.day, 'note', l.note, 'logged_at', l.logged_at,
        'sets', coalesce((select jsonb_agg(jsonb_build_object(
            'item_id', x.item_id, 'item_name', x.item_name, 'position', x.position, 'set_no', x.set_no,
            'load', x.load, 'reps', x.reps, 'done', x.done) order by x.position, x.set_no)
          from public.akb_coaching_set_logs x where x.log_id = l.id), '[]'::jsonb)) order by l.logged_at desc)
      from (select * from public.akb_coaching_logs where subscription_id = sub.id and programme_id = prog.id order by logged_at desc limit 60) l), '[]'::jsonb),
    'check_ins', coalesce((select jsonb_agg(jsonb_build_object(
        'id', c.id, 'created_at', c.created_at, 'week_of', c.week_of, 'programme_week', c.programme_week,
        'energy', c.energy, 'sleep', c.sleep, 'training', c.training, 'wins', c.wins, 'struggles', c.struggles,
        'video_url', c.video_url, 'coach_reply', c.coach_reply, 'replied_at', c.replied_at) order by c.week_of desc)
      from (select * from public.akb_coaching_check_ins where subscription_id = sub.id order by week_of desc limit 20) c), '[]'::jsonb),
    'messages', coalesce((select jsonb_agg(jsonb_build_object(
        'id', m.id, 'created_at', m.created_at, 'from_client', m.from_client, 'body', m.body, 'read_at', m.read_at) order by m.id)
      from (select * from public.akb_coaching_messages where subscription_id = sub.id order by id desc limit 100) m), '[]'::jsonb),
    'unread', (select count(*) from public.akb_coaching_messages m where m.subscription_id = sub.id and not m.from_client and m.read_at is null),
    'check_in_sent', exists (select 1 from public.akb_coaching_check_ins c where c.subscription_id = sub.id
                             and c.week_of = date_trunc('week', public.akb_london_today())::date));
end $$;

-- The member's own: their active subscription's overview, or {active:false}.
create or replace function public.akb_coaching_overview(p_client uuid)
returns jsonb language plpgsql stable set search_path = public as $$
declare
  sub uuid := public.akb_coaching_subscription(p_client);
begin
  if sub is null then return jsonb_build_object('active', false); end if;
  return public.akb_coaching_overview_sub(sub);
end $$;

-- ---------------------------------------------------------------------------
-- What the member does
-- ---------------------------------------------------------------------------

-- Logs a session (p_sets: [{item_id, set_no, load, reps, done}]). Logging the
-- same day again replaces it. Only sets of that day's exercises are kept.
create or replace function public.akb_coaching_log_session(p_client uuid, p_week integer, p_day text, p_note text, p_sets jsonb)
returns uuid language plpgsql set search_path = public as $$
declare
  sub uuid := public.akb_coaching_subscription(p_client);
  prog record;
  lid uuid;
begin
  if sub is null then raise exception 'akb:not_found' using errcode = 'P0001'; end if;
  select * into prog from public.akb_coaching_programmes where subscription_id = sub and active;
  if not found then raise exception 'akb:no_programme' using errcode = 'P0001'; end if;
  if p_week is null or p_week not between 1 and prog.weeks then raise exception 'akb:invalid_week' using errcode = 'P0001'; end if;
  if not exists (select 1 from public.akb_coaching_items where programme_id = prog.id and week = p_week and day = p_day) then
    raise exception 'akb:invalid_day' using errcode = 'P0001';
  end if;
  if jsonb_typeof(p_sets) <> 'array' or jsonb_array_length(p_sets) > 300 then raise exception 'akb:invalid_sets' using errcode = 'P0001'; end if;
  insert into public.akb_coaching_logs (subscription_id, programme_id, week, day, note)
    values (sub, prog.id, p_week, p_day, left(btrim(coalesce(p_note, '')), 500))
    on conflict (programme_id, week, day) do update set note = excluded.note, logged_at = now()
    returning id into lid;
  delete from public.akb_coaching_set_logs where log_id = lid;
  insert into public.akb_coaching_set_logs (log_id, item_id, item_name, position, set_no, load, reps, done)
    select lid, i.id, i.name, i.position, (e ->> 'set_no')::integer,
           left(btrim(coalesce(e ->> 'load', '')), 20), left(btrim(coalesce(e ->> 'reps', '')), 20), coalesce((e ->> 'done')::boolean, false)
    from jsonb_array_elements(p_sets) e
    join public.akb_coaching_items i on i.id = (e ->> 'item_id')::uuid
      and i.programme_id = prog.id and i.week = p_week and i.day = p_day
    where (e ->> 'set_no')::integer between 1 and i.sets;
  insert into public.akb_events (client_id, entity, entity_id, action, detail)
    values (p_client, 'coaching', lid, 'session_logged', jsonb_build_object('week', p_week, 'day', p_day));
  return lid;
end $$;

-- This week's check-in (one a week). akb:already_sent if it has been sent.
create or replace function public.akb_coaching_submit_check_in(
  p_client uuid, p_energy integer, p_sleep integer, p_training integer, p_wins text, p_struggles text, p_video text
) returns uuid language plpgsql set search_path = public as $$
declare
  sub uuid := public.akb_coaching_subscription(p_client);
  prog record;
  cid uuid;
  video text := nullif(btrim(coalesce(p_video, '')), '');
begin
  if sub is null then raise exception 'akb:not_found' using errcode = 'P0001'; end if;
  if p_energy not between 1 and 5 or p_sleep not between 1 and 5 or p_training not between 1 and 5 then
    raise exception 'akb:invalid_score' using errcode = 'P0001';
  end if;
  if video is not null and (char_length(video) > 500 or video !~* '^https?://[^\s]+\.[^\s]+$') then
    raise exception 'akb:invalid_video' using errcode = 'P0001';
  end if;
  select * into prog from public.akb_coaching_programmes where subscription_id = sub and active;
  begin
    insert into public.akb_coaching_check_ins (subscription_id, week_of, programme_week, energy, sleep, training, wins, struggles, video_url)
      values (sub, date_trunc('week', public.akb_london_today())::date,
              case when prog.id is null then null else public.akb_coaching_week(prog.starts_on, prog.weeks) end,
              p_energy, p_sleep, p_training, left(btrim(coalesce(p_wins, '')), 1000), left(btrim(coalesce(p_struggles, '')), 1000), video)
      returning id into cid;
  exception when unique_violation then
    raise exception 'akb:already_sent' using errcode = 'P0001';
  end;
  insert into public.akb_events (client_id, entity, entity_id, action, detail)
    values (p_client, 'coaching', cid, 'check_in_sent', '{}'::jsonb);
  return cid;
end $$;

-- A message to the coach. 30 an hour at most.
create or replace function public.akb_coaching_send_message(p_client uuid, p_body text)
returns bigint language plpgsql set search_path = public as $$
declare
  sub uuid := public.akb_coaching_subscription(p_client);
  body text := btrim(coalesce(p_body, ''));
  mid bigint;
begin
  if sub is null then raise exception 'akb:not_found' using errcode = 'P0001'; end if;
  if char_length(body) not between 1 and 2000 then raise exception 'akb:invalid_message' using errcode = 'P0001'; end if;
  if (select count(*) from public.akb_coaching_messages where subscription_id = sub and from_client and created_at > now() - interval '1 hour') >= 30 then
    raise exception 'akb:too_many' using errcode = 'P0001';
  end if;
  insert into public.akb_coaching_messages (subscription_id, from_client, body) values (sub, true, body) returning id into mid;
  return mid;
end $$;

-- Marks the coach's messages as read (the member opened Messages).
create or replace function public.akb_coaching_mark_read(p_client uuid)
returns void language sql set search_path = public as $$
  update public.akb_coaching_messages set read_at = now()
  where subscription_id = public.akb_coaching_subscription(p_client) and not from_client and read_at is null;
$$;

-- ---------------------------------------------------------------------------
-- What the coach does (the coach area calls these with the server key)
-- ---------------------------------------------------------------------------

-- Writes (or rewrites) a subscription's live programme from p_items:
-- [{week, day, position, name, sets, reps, load, note, video_url}]. What the
-- member has already logged stays (set logs keep the exercise's name).
create or replace function public.akb_coaching_save_programme(
  p_subscription uuid, p_name text, p_goal text, p_weeks integer, p_days_per_week integer, p_starts_on date, p_items jsonb
) returns uuid language plpgsql set search_path = public as $$
declare
  pid uuid;
begin
  if not exists (select 1 from public.akb_subscriptions where id = p_subscription) then raise exception 'akb:not_found' using errcode = 'P0001'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) > 500 then raise exception 'akb:invalid_items' using errcode = 'P0001'; end if;
  select id into pid from public.akb_coaching_programmes where subscription_id = p_subscription and active;
  if pid is null then
    insert into public.akb_coaching_programmes (subscription_id, name, goal, weeks, days_per_week, starts_on)
      values (p_subscription, p_name, coalesce(p_goal, ''), p_weeks, p_days_per_week, p_starts_on) returning id into pid;
  else
    update public.akb_coaching_programmes
      set name = p_name, goal = coalesce(p_goal, ''), weeks = p_weeks, days_per_week = p_days_per_week, starts_on = p_starts_on, updated_at = now()
      where id = pid;
    delete from public.akb_coaching_items where programme_id = pid;
  end if;
  insert into public.akb_coaching_items (programme_id, week, day, position, name, sets, reps, load, note, video_url)
    select pid, (e ->> 'week')::integer, btrim(e ->> 'day'), (e ->> 'position')::integer, btrim(e ->> 'name'), (e ->> 'sets')::integer,
           btrim(coalesce(e ->> 'reps', '')), btrim(coalesce(e ->> 'load', '')), btrim(coalesce(e ->> 'note', '')), nullif(btrim(coalesce(e ->> 'video_url', '')), '')
    from jsonb_array_elements(p_items) e;
  if exists (select 1 from public.akb_coaching_items where programme_id = pid and week > p_weeks) then
    raise exception 'akb:invalid_week' using errcode = 'P0001';
  end if;
  return pid;
end $$;

create or replace function public.akb_coaching_reply_check_in(p_check_in uuid, p_reply text)
returns void language plpgsql set search_path = public as $$
begin
  if char_length(btrim(coalesce(p_reply, ''))) not between 1 and 1000 then raise exception 'akb:invalid_message' using errcode = 'P0001'; end if;
  update public.akb_coaching_check_ins set coach_reply = btrim(p_reply), replied_at = now() where id = p_check_in;
  if not found then raise exception 'akb:not_found' using errcode = 'P0001'; end if;
end $$;

create or replace function public.akb_coaching_coach_message(p_subscription uuid, p_body text)
returns bigint language plpgsql set search_path = public as $$
declare
  body text := btrim(coalesce(p_body, ''));
  mid bigint;
begin
  if char_length(body) not between 1 and 2000 then raise exception 'akb:invalid_message' using errcode = 'P0001'; end if;
  if not exists (select 1 from public.akb_subscriptions where id = p_subscription) then raise exception 'akb:not_found' using errcode = 'P0001'; end if;
  insert into public.akb_coaching_messages (subscription_id, from_client, body) values (p_subscription, false, body) returning id into mid;
  -- Replying means the coach has read the thread.
  update public.akb_coaching_messages set read_at = now() where subscription_id = p_subscription and from_client and read_at is null;
  return mid;
end $$;

-- Unread messages from clients, for the coach area's list.
create or replace function public.akb_coaching_unread_for_coach()
returns jsonb language sql stable set search_path = public as $$
  select coalesce(jsonb_object_agg(subscription_id, n), '{}'::jsonb)
  from (select subscription_id, count(*) as n from public.akb_coaching_messages where from_client and read_at is null group by subscription_id) x;
$$;

-- The coach opened the thread.
create or replace function public.akb_coaching_coach_read(p_subscription uuid)
returns void language sql set search_path = public as $$
  update public.akb_coaching_messages set read_at = now() where subscription_id = p_subscription and from_client and read_at is null;
$$;

-- The coach's inbox for coaching: check-ins still to answer, and the latest
-- unread message from each client with one. Active plans only.
create or replace function public.akb_coaching_inbox()
returns jsonb language sql stable set search_path = public as $$
  select coalesce(jsonb_agg(x.item order by x.at desc), '[]'::jsonb)
  from (
    select c.created_at as at, jsonb_build_object(
      'kind', 'check_in', 'subscription_id', c.subscription_id, 'name', cl.full_name, 'at', c.created_at,
      'detail', concat('Week ', coalesce(c.programme_week::text, '-'), '. Energy ', c.energy, ', sleep ', c.sleep, ', training ', c.training,
                       case when c.struggles <> '' then '. ' || c.struggles else '' end)) as item
    from public.akb_coaching_check_ins c
    join public.akb_subscriptions s on s.id = c.subscription_id and s.status = 'active'
    join public.akb_clients cl on cl.id = s.client_id
    where c.coach_reply is null
    union all
    select m.created_at as at, jsonb_build_object(
      'kind', 'message', 'subscription_id', m.subscription_id, 'name', cl.full_name, 'at', m.created_at, 'detail', left(m.body, 200)) as item
    from (select distinct on (subscription_id) * from public.akb_coaching_messages where from_client and read_at is null order by subscription_id, id desc) m
    join public.akb_subscriptions s on s.id = m.subscription_id and s.status = 'active'
    join public.akb_clients cl on cl.id = s.client_id
  ) x;
$$;

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
      'akb_coaching_subscription', 'akb_coaching_week', 'akb_can_sign_in', 'akb_coaching_status', 'akb_coaching_overview_sub',
      'akb_coaching_overview', 'akb_coaching_log_session', 'akb_coaching_submit_check_in', 'akb_coaching_send_message',
      'akb_coaching_mark_read', 'akb_coaching_save_programme', 'akb_coaching_reply_check_in', 'akb_coaching_coach_message',
      'akb_coaching_unread_for_coach', 'akb_coaching_coach_read', 'akb_coaching_inbox')
  loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
    execute format('grant execute on function %s to service_role', f.sig);
  end loop;
end $$;

notify pgrst, 'reload schema';

commit;
