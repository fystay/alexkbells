-- A usual class size for every group class (owner, 2026-10-29: 12 for now,
-- Alex can change it in the coach portal). Until now a class had no limit
-- unless Alex set a capacity on that date.
--
-- - akb_settings: one small table of whole-number settings. RLS on, no
--   policies, anon/authenticated revoked: only the server's secret key reaches it.
-- - akb_default_class_capacity(): the usual class size (12 until changed).
-- - A class date with its own capacity keeps it; a date without one uses the
--   usual size. The capacity trigger and akb_class_overview both apply it, so
--   the booking calendar, the server's checks and the portal all agree.
-- - akb_class_overview.capacity is now the size that applies; the new last
--   column capacity_set is only what Alex typed for that date (null: usual size).
--
-- Adds one table and two functions; replaces the capacity trigger function and
-- akb_class_overview (same columns plus one). Changes no existing row.
-- Safe to run again. Tests: src/lib/coach/bookings.test.ts.

begin;

create table if not exists public.akb_settings (
  key text primary key check (key ~ '^[a-z_]{1,60}$'),
  int_value integer not null,
  updated_at timestamptz not null default now()
);
alter table public.akb_settings enable row level security;
revoke all on public.akb_settings from public, anon, authenticated;

insert into public.akb_settings (key, int_value) values ('default_class_capacity', 12) on conflict (key) do nothing;

create or replace function public.akb_default_class_capacity()
returns integer language sql stable set search_path = public as $$
  select coalesce((select int_value from public.akb_settings where key = 'default_class_capacity'), 12);
$$;

create or replace function public.akb_set_default_class_capacity(p_capacity integer)
returns void language plpgsql set search_path = public as $$
begin
  if p_capacity is null or p_capacity not between 1 and 200 then raise exception 'akb:invalid_capacity' using errcode = 'P0001'; end if;
  insert into public.akb_settings (key, int_value) values ('default_class_capacity', p_capacity)
    on conflict (key) do update set int_value = excluded.int_value, updated_at = now();
end $$;

-- A place counts towards capacity unless it's a hold that has run out; a class
-- with no capacity of its own uses the usual size.
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
  select coalesce(capacity, public.akb_default_class_capacity()) into cap from public.akb_class_sessions where id = new.class_session_id for update;
  if cap is null then return new; end if;
  select count(*) into taken from public.akb_class_attendance
    where class_session_id = new.class_session_id and status in ('booked', 'attended')
      and (hold_expires_at is null or hold_expires_at > now()) and id <> new.id;
  if taken >= cap then
    raise exception 'akb:class_full' using errcode = 'P0001';
  end if;
  return new;
end $$;

create or replace view public.akb_class_overview with (security_invoker = true) as
  select s.id, s.created_at, s.updated_at, s.slot, s.class_date, s.starts_at, s.duration_minutes,
    coalesce(s.capacity, public.akb_default_class_capacity()) as capacity, s.notes,
    (select count(*) from public.akb_class_attendance a where a.class_session_id = s.id and a.status in ('booked', 'attended')
       and (a.hold_expires_at is null or a.hold_expires_at > now()))::integer as booked,
    (select count(*) from public.akb_class_attendance a where a.class_session_id = s.id and a.status = 'attended')::integer as attended,
    s.cancelled_at, s.cancel_reason,
    s.capacity as capacity_set
  from public.akb_class_sessions s;
revoke all on public.akb_class_overview from public, anon, authenticated;
grant select on public.akb_class_overview to service_role;

do $$
declare
  f record;
begin
  for f in
    select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname in ('akb_default_class_capacity', 'akb_set_default_class_capacity')
  loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
    execute format('grant execute on function %s to service_role', f.sig);
  end loop;
end $$;

notify pgrst, 'reload schema';

commit;
