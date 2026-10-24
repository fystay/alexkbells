-- Cancelling a whole class (2026-10-24).
--
-- The policy says: "If a class is cancelled by the coach, your credit will be
-- returned to your account". akb_cancel_class cancels every booked place on
-- one class date in one transaction: members' credits come back (never
-- counted as a late cancellation, however close to the class), and unpaid
-- pay-as-you-go charges are cancelled as for any cancelled place. The class
-- is marked cancelled, so no one can be booked onto it again, and the public
-- calendar stops offering it.
--
-- Safe on live data: adds two columns (empty by default), one trigger and one
-- function, and two columns at the end of the akb_class_overview view.
-- Reads and changes no rows itself. No deletes.

begin;

alter table public.akb_class_sessions
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancel_reason text not null default '' check (char_length(cancel_reason) <= 500);

-- The overview gains the two columns at the end (its earlier columns are
-- listed by name: `s.*` was fixed when the view was first created).
create or replace view public.akb_class_overview with (security_invoker = true) as
  select s.id, s.created_at, s.updated_at, s.slot, s.class_date, s.starts_at, s.duration_minutes, s.capacity, s.notes,
    (select count(*) from public.akb_class_attendance a where a.class_session_id = s.id and a.status in ('booked', 'attended'))::integer as booked,
    (select count(*) from public.akb_class_attendance a where a.class_session_id = s.id and a.status = 'attended')::integer as attended,
    s.cancelled_at, s.cancel_reason
  from public.akb_class_sessions s;
revoke all on public.akb_class_overview from public, anon, authenticated;
grant select on public.akb_class_overview to service_role;

-- No new or restored places on a cancelled class.
create or replace function public.akb_class_not_cancelled()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.status = 'booked' and (tg_op = 'INSERT' or old.status <> 'booked')
     and exists (select 1 from public.akb_class_sessions s where s.id = new.class_session_id and s.cancelled_at is not null) then
    raise exception 'akb:class_cancelled' using errcode = 'P0001';
  end if;
  return new;
end $$;

drop trigger if exists akb_class_not_cancelled on public.akb_class_attendance;
create trigger akb_class_not_cancelled
  before insert or update of status on public.akb_class_attendance
  for each row execute function public.akb_class_not_cancelled();

-- Returns how many places were cancelled.
create or replace function public.akb_cancel_class(p_session uuid, p_reason text)
returns integer language plpgsql set search_path = public as $$
declare
  s record;
  a record;
  n integer := 0;
begin
  select * into s from public.akb_class_sessions where id = p_session for update;
  if not found then raise exception 'akb:not_found' using errcode = 'P0001'; end if;
  if s.cancelled_at is not null then return 0; end if;
  update public.akb_class_sessions
    set cancelled_at = now(), cancel_reason = coalesce(p_reason, ''), updated_at = now()
    where id = p_session;
  -- The coach cancelled, so credits come back whatever the time (akb_attendance_credit_rules).
  perform set_config('akb.return_credit', 'on', true);
  for a in select id from public.akb_class_attendance where class_session_id = p_session and status = 'booked' for update loop
    perform public.akb_set_attendance(a.id, 'cancelled');
    n := n + 1;
  end loop;
  perform set_config('akb.return_credit', '', true);
  insert into public.akb_events (client_id, entity, entity_id, action, detail)
    values (null, 'class', p_session, 'cancelled', jsonb_build_object('places', n, 'reason', coalesce(p_reason, '')));
  return n;
end $$;

revoke all on function public.akb_cancel_class(uuid, text) from public, anon, authenticated;
grant execute on function public.akb_cancel_class(uuid, text) to service_role;
revoke all on function public.akb_class_not_cancelled() from public, anon, authenticated;

notify pgrst, 'reload schema';

commit;
