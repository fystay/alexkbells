-- Tests for booking and paying for a group class online (20261029000000), run
-- against a throwaway local Postgres 16 with Supabase's anon, authenticated
-- and service_role roles and every migration applied in order. Everything
-- runs in one transaction and is rolled back. Any failed check raises an error.

begin;

create or replace function pg_temp.expect_error(p_sql text, p_message text) returns void language plpgsql as $$
begin
  execute p_sql;
  raise exception 'expected error % but none was raised: %', p_message, p_sql;
exception when others then
  if sqlerrm <> p_message then raise exception 'expected % but got % for: %', p_message, sqlerrm, p_sql; end if;
end $$;

create or replace function pg_temp.ok(p_cond boolean, p_what text) returns void language plpgsql as $$
begin
  if not coalesce(p_cond, false) then raise exception 'FAILED: %', p_what; end if;
  raise notice 'ok: %', p_what;
end $$;

create or replace function pg_temp.pay(p_charge uuid, p_pence integer, p_key text) returns uuid language sql as $$
  select public.akb_record_payment((select client_id from public.akb_charges where id = p_charge), 'group', p_pence,
    public.akb_london_today(), 'card', '', '', p_key, jsonb_build_array(jsonb_build_object('charge_id', p_charge, 'amount_pence', p_pence)));
$$;

create or replace function pg_temp.h(t text) returns text language sql as $$ select encode(sha256(convert_to(t, 'UTF8')), 'hex') $$;

-- Book (no credit) the 18:30 class on p_day days from today.
create or replace function pg_temp.book(p_email text, p_day integer, p_key text) returns jsonb language sql as $$
  select public.akb_create_class_booking('Booker', p_email, '', 'mon-evening', public.akb_london_today() + p_day,
    ((public.akb_london_today() + p_day)::timestamp + time '18:30') at time zone 'Europe/London', 60,
    1200, 'Group class', null, p_key);
$$;

do $$
declare
  r jsonb; r2 jsonb;
  k record;
  sid uuid;
  att uuid;
  cid uuid;
begin
  -- A booking holds a place for 15 minutes and raises one charge at the class price.
  r := pg_temp.book('one@example.com', 3, 'cls-key-001');
  select * into k from public.akb_class_bookings where id = (r ->> 'booking_id')::uuid;
  perform pg_temp.ok(r ->> 'status' = 'awaiting_payment', 'a booking waits for payment');
  perform pg_temp.ok((select hold_expires_at between now() + interval '14 minutes' and now() + interval '16 minutes' and status = 'booked'
                      from public.akb_class_attendance where id = k.attendance_id), 'the place is held for 15 minutes');
  perform pg_temp.ok((select amount_pence from public.akb_charges where id = k.charge_id) = 1200, 'one charge at the class price');
  perform pg_temp.ok(pg_temp.book('one@example.com', 3, 'cls-key-001') ->> 'booking_id' = r ->> 'booking_id', 'the same submission again changes nothing');
  perform pg_temp.expect_error($q$select pg_temp.book('one@example.com', 3, 'cls-key-002')$q$, 'akb:already_booked');

  -- Capacity: a live hold counts, an expired one doesn't.
  select class_session_id into sid from public.akb_class_attendance where id = k.attendance_id;
  update public.akb_class_sessions set capacity = 1 where id = sid;
  perform pg_temp.expect_error($q$select pg_temp.book('two@example.com', 3, 'cls-key-003')$q$, 'akb:class_full');
  update public.akb_class_attendance set hold_expires_at = now() - interval '1 minute' where id = k.attendance_id;
  perform pg_temp.ok((select booked from public.akb_class_overview where id = sid) = 0, 'an expired hold no longer counts as booked');
  r2 := pg_temp.book('two@example.com', 3, 'cls-key-004');
  perform pg_temp.ok(r2 ->> 'status' = 'awaiting_payment', 'someone else can take a place whose hold ran out');
  perform pg_temp.ok((select status from public.akb_class_bookings where id = k.id) = 'expired', 'and the expired booking is marked expired');

  -- Paying confirms the place.
  perform pg_temp.pay((r2 ->> 'charge_id')::uuid, 1200, 'cls-pay-001');
  perform pg_temp.ok((select status from public.akb_class_bookings where id = (r2 ->> 'booking_id')::uuid) = 'confirmed', 'paid: confirmed');
  perform pg_temp.ok((select a.hold_expires_at is null and a.status = 'booked' from public.akb_class_attendance a
                      join public.akb_class_bookings b on b.attendance_id = a.id where b.id = (r2 ->> 'booking_id')::uuid), 'paid: the hold is cleared');

  -- A late payment for a class that has since filled: recorded, flagged for Alex.
  perform pg_temp.pay(k.charge_id, 1200, 'cls-pay-002');
  perform pg_temp.ok((select status from public.akb_class_bookings where id = k.id) = 'needs_attention', 'a late payment for a full class needs Alex');
  -- A late payment while there's still room confirms the place.
  update public.akb_class_sessions set capacity = null where id = sid;
  r := pg_temp.book('three@example.com', 3, 'cls-key-005');
  update public.akb_class_attendance set hold_expires_at = now() - interval '5 minutes'
    where id = (select attendance_id from public.akb_class_bookings where id = (r ->> 'booking_id')::uuid);
  perform public.akb_release_class_holds();
  perform pg_temp.pay((r ->> 'charge_id')::uuid, 1200, 'cls-pay-003');
  perform pg_temp.ok((select status from public.akb_class_bookings where id = (r ->> 'booking_id')::uuid) = 'confirmed', 'a late payment with room left confirms');

  -- Unpaid for 24 hours after the hold: the charge is cancelled.
  r := pg_temp.book('four@example.com', 4, 'cls-key-006');
  update public.akb_class_attendance set hold_expires_at = now() - interval '25 hours'
    where id = (select attendance_id from public.akb_class_bookings where id = (r ->> 'booking_id')::uuid);
  perform public.akb_release_class_holds();
  perform pg_temp.ok((select voided_at is not null from public.akb_charges where id = (r ->> 'charge_id')::uuid), 'an unpaid charge is cancelled after 24 hours');

  -- Cancelling 24 hours or more before: a credit for 28 days; booking with it costs nothing.
  update public.akb_class_bookings set manage_token_hash = pg_temp.h('manage-1') where id = (r2 ->> 'booking_id')::uuid;
  perform pg_temp.ok((public.akb_class_booking_by_token(pg_temp.h('manage-1')) ->> 'can_cancel')::boolean, 'the private link can cancel');
  perform pg_temp.ok((public.akb_cancel_class_booking(pg_temp.h('manage-1'), pg_temp.h('credit-1')) ->> 'credit')::boolean, 'cancelled in time: a credit');
  perform pg_temp.ok((public.akb_class_credit_by_token(pg_temp.h('credit-1')) ->> 'usable')::boolean, 'the credit is usable');
  perform pg_temp.ok((public.akb_class_credit_by_token(pg_temp.h('credit-1')) ->> 'expires_on')::date = public.akb_london_today() + 28, 'for 28 days');
  r := public.akb_create_class_booking('Anyone', 'someone-else@example.com', '', 'sat-morning', public.akb_london_today() + 5,
         ((public.akb_london_today() + 5)::timestamp + time '09:00') at time zone 'Europe/London', 60, 1200, 'Group class', pg_temp.h('credit-1'), 'cls-key-007');
  perform pg_temp.ok(r ->> 'status' = 'confirmed' and r ->> 'charge_id' is null, 'booked with the credit: confirmed, nothing to pay');
  perform pg_temp.ok((select client_id from public.akb_class_bookings where id = (r ->> 'booking_id')::uuid)
                     = (select client_id from public.akb_class_bookings where id = (r2 ->> 'booking_id')::uuid), 'for the credit''s owner');
  perform pg_temp.expect_error(format($q$select public.akb_create_class_booking('x', 'x@example.com', '', 'sat-morning', public.akb_london_today() + 6, now() + interval '6 days', 60, 1200, 'Group class', %L, 'cls-key-008')$q$, pg_temp.h('credit-1')),
    'akb:credit_invalid');

  -- Cancelling under 24 hours before: nothing back.
  r := pg_temp.book('late@example.com', 1, 'cls-key-009');
  -- Then the class is moved to three hours from now (so the test runs at any time of day).
  update public.akb_class_sessions set starts_at = now() + interval '3 hours'
    where id = (select a.class_session_id from public.akb_class_attendance a join public.akb_class_bookings b on b.attendance_id = a.id where b.id = (r ->> 'booking_id')::uuid);
  perform pg_temp.pay((r ->> 'charge_id')::uuid, 1200, 'cls-pay-004');
  update public.akb_class_bookings set manage_token_hash = pg_temp.h('manage-2') where id = (r ->> 'booking_id')::uuid;
  perform pg_temp.ok(not (public.akb_cancel_class_booking(pg_temp.h('manage-2'), pg_temp.h('credit-2')) ->> 'credit')::boolean, 'late cancel: no credit');
  perform pg_temp.ok(public.akb_class_credit_by_token(pg_temp.h('credit-2')) is null, 'and no credit exists');
  perform pg_temp.expect_error(format('select public.akb_cancel_class_booking(%L, %L)', pg_temp.h('manage-2'), pg_temp.h('credit-3')), 'akb:not_booked');
end $$;

-- A class that has started can't be booked.
select pg_temp.expect_error($q$select public.akb_create_class_booking('x', 'x@example.com', '', 'sat-morning', current_date, now() - interval '1 minute', 60, 1200, 'Group class', null, 'cls-key-010')$q$, 'akb:class_started');

-- Nobody but the server.
set local role anon;
select pg_temp.expect_error('select * from public.akb_class_bookings', 'permission denied for table akb_class_bookings');
select pg_temp.expect_error('select * from public.akb_class_credits', 'permission denied for table akb_class_credits');
select pg_temp.expect_error($q$select public.akb_class_credit_by_token('x')$q$, 'permission denied for function akb_class_credit_by_token');
reset role;
set local role authenticated;
select pg_temp.expect_error($q$select public.akb_release_class_holds()$q$, 'permission denied for function akb_release_class_holds');
reset role;
select 'ALL CLASS BOOKING CHECKS PASSED' as result;

rollback;
