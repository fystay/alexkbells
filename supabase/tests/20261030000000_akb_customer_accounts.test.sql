-- Tests for accounts for everyone who has paid (20261030000000), run against a
-- throwaway local Postgres 16 with Supabase's anon, authenticated and
-- service_role roles and every migration applied in order. Everything runs in
-- one transaction and is rolled back. Any failed check raises an error.

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

-- Book (no credit) the 18:30 class p_day days from today.
create or replace function pg_temp.book(p_email text, p_day integer, p_key text) returns jsonb language sql as $$
  select public.akb_create_class_booking('Pay As You Go', p_email, '07700 900000', 'mon-evening', public.akb_london_today() + p_day,
    ((public.akb_london_today() + p_day)::timestamp + time '18:30') at time zone 'Europe/London', 60,
    1200, 'Group class', null, p_key);
$$;

do $$
declare
  r jsonb; r2 jsonb; o jsonb;
  cid uuid; other uuid; att uuid; cr uuid;
begin
  -- Booked but not paid: no account.
  r := pg_temp.book('payg@example.com', 3, 'acc-key-001');
  select client_id into cid from public.akb_class_bookings where id = (r ->> 'booking_id')::uuid;
  perform pg_temp.ok(not public.akb_can_sign_in(cid), 'a booking not yet paid gives no account');
  perform pg_temp.ok(not public.akb_member_create_login_link('payg@example.com', pg_temp.h('link-0')), 'and no sign-in link');

  -- Paid: they can sign in, with no membership.
  perform pg_temp.pay((r ->> 'charge_id')::uuid, 1200, 'acc-pay-001');
  perform pg_temp.ok(public.akb_can_sign_in(cid) and not public.akb_is_member(cid), 'paid: an account, not a member');
  perform pg_temp.ok(public.akb_member_create_login_link('PAYG@example.com ', pg_temp.h('link-1')), 'a sign-in link for the booker');
  perform pg_temp.ok(public.akb_member_redeem_login_link(pg_temp.h('link-1'), pg_temp.h('session-1')) = cid, 'the link signs them in');
  perform pg_temp.ok(public.akb_member_session_client(pg_temp.h('session-1')) = cid, 'the session is theirs');

  -- What the account shows.
  o := public.akb_member_overview(cid);
  perform pg_temp.ok(o -> 'membership' = 'null'::jsonb and o -> 'period' = 'null'::jsonb, 'no membership, no period');
  perform pg_temp.ok(o -> 'client' ->> 'email' = 'payg@example.com' and o -> 'client' ->> 'phone' = '07700 900000', 'their details, to fill the booking form');
  perform pg_temp.ok(jsonb_array_length(o -> 'places') = 1, 'their place');
  perform pg_temp.ok(o -> 'places' -> 0 ->> 'how' = 'paid', 'paid online');
  perform pg_temp.ok((o -> 'places' -> 0 ->> 'can_cancel')::boolean, 'and they can cancel it here');
  perform pg_temp.ok((o ->> 'paid_classes_28d')::integer = 1, 'one class paid singly');

  -- A place still held for payment isn't shown.
  r2 := pg_temp.book('payg@example.com', 5, 'acc-key-002');
  perform pg_temp.ok(jsonb_array_length(public.akb_member_overview(cid) -> 'places') = 1, 'a place still held for payment is left out');

  -- Cancelling from the account: only their own place.
  select attendance_id into att from public.akb_class_bookings where id = (r ->> 'booking_id')::uuid;
  other := (select id from public.akb_clients where email = 'nobody-else@example.com');
  insert into public.akb_clients (full_name, email, status) values ('Someone Else', 'someone-else@example.com', 'lead') returning id into other;
  perform pg_temp.expect_error(format('select public.akb_member_cancel_booking(%L, %L, %L)', other, att, pg_temp.h('credit-x')), 'akb:not_found');
  perform pg_temp.ok((public.akb_member_cancel_booking(cid, att, pg_temp.h('credit-1')) ->> 'credit')::boolean, 'cancelled 3 days before: a class credit');
  perform pg_temp.expect_error(format('select public.akb_member_cancel_booking(%L, %L, %L)', cid, att, pg_temp.h('credit-2')), 'akb:not_booked');
  o := public.akb_member_overview(cid);
  perform pg_temp.ok(jsonb_array_length(o -> 'class_credits') = 1, 'the credit shows in the account');
  perform pg_temp.ok((o -> 'class_credits' -> 0 ->> 'expires_on')::date = public.akb_london_today() + 28, 'for 28 days');
  perform pg_temp.ok(public.akb_can_sign_in(cid), 'a cancelled paid booking still gives an account');

  -- Booking with the credit from the account: only their own credit.
  cr := (o -> 'class_credits' -> 0 ->> 'id')::uuid;
  perform pg_temp.expect_error(format($q$select public.akb_member_book_with_class_credit(%L, %L, 'sat-morning', public.akb_london_today() + 6,
    ((public.akb_london_today() + 6)::timestamp + time '09:00') at time zone 'Europe/London', 60, 'acc-key-003')$q$, other, cr), 'akb:credit_invalid');
  r := public.akb_member_book_with_class_credit(cid, cr, 'sat-morning', public.akb_london_today() + 6,
         ((public.akb_london_today() + 6)::timestamp + time '09:00') at time zone 'Europe/London', 60, 'acc-key-004');
  perform pg_temp.ok(r ->> 'status' = 'confirmed' and r ->> 'charge_id' is null, 'booked with the credit: confirmed, nothing to pay');
  o := public.akb_member_overview(cid);
  perform pg_temp.ok(jsonb_array_length(o -> 'class_credits') = 0, 'the credit is used');
  perform pg_temp.ok(exists (select 1 from jsonb_array_elements(o -> 'places') p where p ->> 'how' = 'class_credit' and p ->> 'status' = 'booked'),
    'the place shows as booked with a class credit');
  perform pg_temp.expect_error(format($q$select public.akb_member_book_with_class_credit(%L, %L, 'sat-morning', public.akb_london_today() + 13,
    ((public.akb_london_today() + 13)::timestamp + time '09:00') at time zone 'Europe/London', 60, 'acc-key-005')$q$, cid, cr), 'akb:credit_invalid');

  -- Someone Alex recorded a payment for can sign in too; someone with nothing paid can't.
  perform pg_temp.ok(not public.akb_can_sign_in(other), 'nothing paid: no account');
  perform public.akb_record_payment(other, 'pt', 3500, public.akb_london_today(), 'cash', '', '', 'acc-pay-002', '[]'::jsonb);
  perform pg_temp.ok(public.akb_can_sign_in(other), 'a payment Alex recorded: an account');
  perform pg_temp.ok(jsonb_array_length(public.akb_member_overview(other) -> 'places') = 0, 'with nothing booked');

  -- Members are unchanged: they can sign in and their overview still has the membership.
  insert into public.akb_clients (full_name, email, status) values ('Member', 'member-acc@example.com', 'active') returning id into other;
  perform public.akb_start_membership(other, 'regular', 'Regular', 6500, 8, public.akb_london_today());
  perform pg_temp.ok(public.akb_can_sign_in(other), 'a member can sign in');
  perform pg_temp.ok(public.akb_member_overview(other) -> 'membership' ->> 'plan' = 'regular', 'and sees their membership');
end $$;

-- Nobody but the server.
set local role anon;
select pg_temp.expect_error($q$select public.akb_can_sign_in(gen_random_uuid())$q$, 'permission denied for function akb_can_sign_in');
select pg_temp.expect_error($q$select public.akb_member_cancel_booking(gen_random_uuid(), gen_random_uuid(), 'x')$q$, 'permission denied for function akb_member_cancel_booking');
reset role;
set local role authenticated;
select pg_temp.expect_error($q$select public.akb_member_book_with_class_credit(gen_random_uuid(), gen_random_uuid(), 'x', current_date, now(), 60, 'xxxxxxxx')$q$, 'permission denied for function akb_member_book_with_class_credit');
reset role;
select 'ALL CUSTOMER ACCOUNT CHECKS PASSED' as result;

rollback;
