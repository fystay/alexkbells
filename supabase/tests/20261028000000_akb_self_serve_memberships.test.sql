-- Tests for joining and paying online (20261028000000), run against a
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

-- Pays a charge the way Alex would record it (the Square webhook allocates the same way).
create or replace function pg_temp.pay(p_charge uuid, p_pence integer, p_key text) returns uuid language sql as $$
  select public.akb_record_payment((select client_id from public.akb_charges where id = p_charge), 'group', p_pence,
    public.akb_london_today(), 'card', '', '', p_key, jsonb_build_array(jsonb_build_object('charge_id', p_charge, 'amount_pence', p_pence)));
$$;

do $$
declare
  today date := public.akb_london_today();
  -- A class two days from now at 18:30 London time.
  cls_date date := public.akb_london_today() + 2;
  cls_at timestamptz := ((public.akb_london_today() + 2)::timestamp + time '18:30') at time zone 'Europe/London';
  r jsonb; r2 jsonb;
  s record;
  cid uuid; mid uuid; per uuid; pid uuid;
  n integer;
begin
  -- Joining creates the client, one charge at the plan's price, and a sign-up waiting for payment.
  r := public.akb_create_membership_signup('New Member', ' New@Example.com ', '07700 900000', 'regular', 'Regular', 6500, 8,
         'mon-evening', cls_date, cls_at, 60, now(), 'key-00000001');
  select * into s from public.akb_membership_signups where id = (r ->> 'signup_id')::uuid;
  cid := s.client_id;
  perform pg_temp.ok(s.status = 'awaiting_payment' and s.first_class = 'requested', 'a sign-up waits for payment');
  perform pg_temp.ok((select email from public.akb_clients where id = cid) = 'new@example.com', 'the client is created with a clean email');
  perform pg_temp.ok((select amount_pence from public.akb_charges where id = s.charge_id) = 6500, 'one charge at the plan price');
  perform pg_temp.ok(not exists (select 1 from public.akb_memberships where client_id = cid), 'no membership before payment');
  perform pg_temp.ok(not public.akb_is_member(cid), 'not a member before payment');

  -- The same submission again changes nothing.
  r2 := public.akb_create_membership_signup('New Member', 'new@example.com', '', 'regular', 'Regular', 6500, 8,
          'mon-evening', cls_date, cls_at, 60, now(), 'key-00000001');
  perform pg_temp.ok(r2 ->> 'signup_id' = r ->> 'signup_id', 'a repeated submission returns the same sign-up');
  perform pg_temp.ok((select count(*) from public.akb_charges where client_id = cid) = 1, 'and no second charge');

  -- Joining again (another plan) before paying replaces the first sign-up and retires its charge.
  r2 := public.akb_create_membership_signup('New Member', 'new@example.com', '', 'starter', 'Starter', 4000, 4,
          null, null, null, null, now(), 'key-00000002');
  perform pg_temp.ok((select status from public.akb_membership_signups where id = (r ->> 'signup_id')::uuid) = 'replaced', 'the earlier sign-up is replaced');
  perform pg_temp.ok((select voided_at is not null from public.akb_charges where id = (r ->> 'charge_id')::uuid), 'its charge is cancelled');
  perform pg_temp.ok((select count(*) from public.akb_membership_signups where client_id = cid and status = 'awaiting_payment') = 1, 'one sign-up waits');
  -- Back to Regular with the first class, for the rest of the checks.
  r := public.akb_create_membership_signup('New Member', 'new@example.com', '', 'regular', 'Regular', 6500, 8,
         'mon-evening', cls_date, cls_at, 60, now(), 'key-00000003');
  select * into s from public.akb_membership_signups where id = (r ->> 'signup_id')::uuid;

  -- A part payment doesn't start anything; then the rest arrives and it starts.
  pid := pg_temp.pay(s.charge_id, 1000, 'pay-part-1');
  perform pg_temp.ok((select status from public.akb_membership_signups where id = s.id) = 'awaiting_payment', 'a part payment starts nothing');
  perform pg_temp.expect_error(format($q$select public.akb_create_membership_signup('New Member', 'new@example.com', '', 'starter', 'Starter', 4000, 4, null, null, null, null, now(), 'key-00000004')$q$),
    'akb:payment_in_progress');
  perform pg_temp.pay(s.charge_id, 5500, 'pay-rest-1');
  select * into s from public.akb_membership_signups where id = s.id;
  perform pg_temp.ok(s.status = 'active' and s.membership_id is not null, 'paid in full: the membership starts');
  select id into mid from public.akb_memberships where client_id = cid;
  perform pg_temp.ok((select pay_online and start_on = today and next_period_on = today + 28 and credits = 8 from public.akb_memberships where id = mid),
    'it starts today, pays online, renews in four weeks');
  select id into per from public.akb_membership_periods where membership_id = mid;
  perform pg_temp.ok((select charge_id from public.akb_membership_periods where id = per) = s.charge_id, 'the first period is the paid charge');
  perform pg_temp.ok((select count(*) from public.akb_charges where client_id = cid and voided_at is null) = 1, 'no second charge');
  perform pg_temp.ok(public.akb_is_member(cid), 'now a member (can sign in)');
  perform pg_temp.ok((select status from public.akb_clients where id = cid) = 'active', 'the client is active');
  perform pg_temp.ok(s.first_class = 'booked', 'the first class is booked');
  perform pg_temp.ok(exists (select 1 from public.akb_class_attendance a join public.akb_class_sessions cs on cs.id = a.class_session_id
                             where a.client_id = cid and cs.class_date = cls_date and a.membership_period_id = per), 'with a credit');
  perform pg_temp.expect_error(format($q$select public.akb_create_membership_signup('New Member', 'new@example.com', '', 'starter', 'Starter', 4000, 4, null, null, null, null, now(), 'key-00000005')$q$),
    'akb:already_member');

  -- Renewals: the next period's credits wait for its charge.
  update public.akb_memberships set next_period_on = today where id = mid;
  update public.akb_membership_periods set period_start = today - 28, period_end = today - 1 where id = per;
  n := public.akb_renew_memberships(today);
  perform pg_temp.ok(n = 1, 'the renewal makes a new period');
  select id into per from public.akb_membership_periods where membership_id = mid and period_start = today;
  perform pg_temp.ok((select count(*) from jsonb_array_elements(public.akb_unpaid_online_periods(today)) e where (e ->> 'period_id')::uuid = per) = 1, 'it is listed for a pay link');
  perform pg_temp.ok((public.akb_member_payment_due(cid) ->> 'outstanding_pence')::integer = 6500, 'the member sees payment due');
  perform pg_temp.expect_error(format('select public.akb_member_book_class(%L, ''wed-evening'', %L, %L, 60)', cid, cls_date, cls_at + interval '2 days'),
    'akb:period_unpaid');
  update public.akb_membership_periods set pay_link_sent_at = now() where id = per;
  perform pg_temp.ok((select count(*) from jsonb_array_elements(public.akb_unpaid_online_periods(today)) e where (e ->> 'period_id')::uuid = per) = 0, 'a sent link is not sent again');
  perform pg_temp.pay((select charge_id from public.akb_membership_periods where id = per), 6500, 'pay-renewal-1');
  perform pg_temp.ok(public.akb_member_payment_due(cid) is null, 'nothing due once paid');
  perform public.akb_member_book_class(cid, 'wed-evening', cls_date + 2, cls_at + interval '2 days', 60);
  perform pg_temp.ok(true, 'once paid, the credits work');

  -- Memberships Alex starts by hand are unchanged: their credits don't wait for payment.
  insert into public.akb_clients (full_name, email) values ('Manual Member', 'manual@example.com') returning id into cid;
  perform public.akb_start_membership(cid, 'starter', 'Starter', 4000, 4, today);
  perform public.akb_member_book_class(cid, 'wed-evening', cls_date + 2, cls_at + interval '2 days', 60);
  perform pg_temp.ok(true, 'a hand-started membership books before payment, as before');

  -- A payment is never lost: if the membership can't start, the sign-up waits for Alex.
  r := public.akb_create_membership_signup('Clash', 'clash@example.com', '', 'starter', 'Starter', 4000, 4,
         null, null, null, null, now(), 'key-00000006');
  select client_id into cid from public.akb_membership_signups where id = (r ->> 'signup_id')::uuid;
  perform public.akb_start_membership(cid, 'starter', 'Starter', 4000, 4, today);  -- Alex started one by hand meanwhile
  pid := pg_temp.pay((r ->> 'charge_id')::uuid, 4000, 'pay-clash-1');
  perform pg_temp.ok((select status from public.akb_membership_signups where id = (r ->> 'signup_id')::uuid) = 'needs_attention', 'a clash needs Alex');
  perform pg_temp.ok(exists (select 1 from public.akb_payments where id = pid), 'and the payment is still recorded');

  -- A first class that can't be booked (already started) doesn't stop the membership.
  r := public.akb_create_membership_signup('Late', 'late@example.com', '', 'starter', 'Starter', 4000, 4,
         'sat-morning', today, now() - interval '1 hour', 60, now(), 'key-00000007');
  perform pg_temp.pay((r ->> 'charge_id')::uuid, 4000, 'pay-late-1');
  select * into s from public.akb_membership_signups where id = (r ->> 'signup_id')::uuid;
  perform pg_temp.ok(s.status = 'active' and s.first_class = 'unavailable', 'a missed first class: member, booked later');
end $$;

-- Nobody but the server.
set local role anon;
select pg_temp.expect_error('select * from public.akb_membership_signups', 'permission denied for table akb_membership_signups');
select pg_temp.expect_error($q$select public.akb_create_membership_signup('x', 'x@example.com', '', 'starter', 'Starter', 4000, 4, null, null, null, null, now(), 'key-anon-01')$q$, 'permission denied for function akb_create_membership_signup');
reset role;
set local role authenticated;
select pg_temp.expect_error('select public.akb_member_payment_due(gen_random_uuid())', 'permission denied for function akb_member_payment_due');
reset role;
select 'ALL SELF-SERVE MEMBERSHIP CHECKS PASSED' as result;

rollback;
