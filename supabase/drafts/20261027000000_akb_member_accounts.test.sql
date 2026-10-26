-- Tests for the member accounts DRAFT, run against a throwaway local
-- Postgres 16 with every migration and the draft applied (see
-- docs/MEMBER_ACCOUNTS_DRAFT.md → "How it was tested"). Everything runs in
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

-- Hex SHA-256 of a text, as the website would send it.
create or replace function pg_temp.h(t text) returns text language sql as $$ select encode(sha256(convert_to(t, 'UTF8')), 'hex') $$;

do $$
declare
  today date := public.akb_london_today();
  a uuid; b uuid; c uuid; old uuid;
  ma uuid;
  place uuid; soon uuid; p uuid;
  late boolean;
  ov jsonb;
  i integer;
begin
  insert into public.akb_clients (full_name, email) values ('Member A', 'a@example.com') returning id into a;
  insert into public.akb_clients (full_name, email) values ('Member B', 'b@example.com') returning id into b;
  insert into public.akb_clients (full_name, email) values ('Not A Member', 'c@example.com') returning id into c;
  insert into public.akb_clients (full_name, email) values ('Former Member', 'old@example.com') returning id into old;
  ma := public.akb_start_membership(a, 'regular', 'Regular', 6500, 8, today);
  perform public.akb_start_membership(b, 'starter', 'Starter', 4000, 4, today);
  -- A former member: a membership that ended long ago.
  perform public.akb_start_membership(old, 'starter', 'Starter', 4000, 4, today - 60);
  perform public.akb_set_membership_status((select id from public.akb_memberships where client_id = old), 'cancelled', today - 30);

  -- Who can sign in
  perform pg_temp.ok(public.akb_is_member(a), 'an active member is a member');
  perform pg_temp.ok(not public.akb_is_member(c), 'a client without a membership is not');
  perform pg_temp.ok(not public.akb_is_member(old), 'a cancelled membership whose last period has ended is not');
  perform public.akb_set_membership_status((select id from public.akb_memberships where client_id = b), 'paused', today);
  perform pg_temp.ok(public.akb_is_member(b), 'a paused member is still a member');

  -- Sign-in links
  perform pg_temp.ok(public.akb_member_create_login_link('a@example.com', pg_temp.h('t1')), 'a member gets a link');
  perform pg_temp.ok(public.akb_member_create_login_link('  A@Example.COM ', pg_temp.h('t2')), 'the email match ignores case and spaces');
  perform pg_temp.ok(not public.akb_member_create_login_link('c@example.com', pg_temp.h('t3')), 'a non-member gets no link');
  perform pg_temp.ok(not public.akb_member_create_login_link('nobody@example.com', pg_temp.h('t4')), 'an unknown address gets no link');
  perform pg_temp.ok(not public.akb_member_create_login_link('old@example.com', pg_temp.h('t5')), 'a former member gets no link');
  perform pg_temp.ok(public.akb_member_create_login_link('a@example.com', pg_temp.h('t6')), 'third link this hour');
  perform pg_temp.ok(public.akb_member_create_login_link('a@example.com', pg_temp.h('t7')), 'fourth link this hour');
  perform pg_temp.ok(public.akb_member_create_login_link('a@example.com', pg_temp.h('t8')), 'fifth link this hour');
  perform pg_temp.ok(not public.akb_member_create_login_link('a@example.com', pg_temp.h('t9')), 'a sixth link in an hour is refused');
  perform pg_temp.ok((select count(*) from public.akb_member_login_links where token_hash = pg_temp.h('t1') and expires_at <= now() + interval '15 minutes') = 1, 'links expire within 15 minutes');

  -- Redeeming
  perform pg_temp.ok(public.akb_member_redeem_login_link(pg_temp.h('t1'), pg_temp.h('s1')) = a, 'a valid link signs the member in');
  perform pg_temp.ok(public.akb_member_redeem_login_link(pg_temp.h('t1'), pg_temp.h('s1b')) is null, 'a link works once only');
  perform pg_temp.ok(public.akb_member_redeem_login_link(pg_temp.h('nope'), pg_temp.h('s1c')) is null, 'an unknown link does nothing');
  insert into public.akb_member_login_links (client_id, token_hash, created_at, expires_at)
    values (a, pg_temp.h('expired'), now() - interval '1 hour', now() - interval '45 minutes');
  perform pg_temp.ok(public.akb_member_redeem_login_link(pg_temp.h('expired'), pg_temp.h('s1d')) is null, 'an expired link does nothing');
  perform pg_temp.ok((select count(*) from public.akb_member_sessions where client_id = a) = 1, 'only the valid link opened a session');
  perform pg_temp.ok((select token_hash from public.akb_member_login_links where token_hash = pg_temp.h('t1')) <> 't1', 'links are stored hashed');

  -- Sessions
  perform pg_temp.ok(public.akb_member_session_client(pg_temp.h('s1')) = a, 'the session identifies the member');
  perform pg_temp.ok(public.akb_member_session_client(pg_temp.h('other')) is null, 'an unknown session is nobody');
  perform public.akb_member_redeem_login_link(pg_temp.h('t2'), pg_temp.h('s2'));
  perform public.akb_member_sign_out(pg_temp.h('s1'));
  perform pg_temp.ok(public.akb_member_session_client(pg_temp.h('s1')) is null, 'signing out ends that session');
  perform pg_temp.ok(public.akb_member_session_client(pg_temp.h('s2')) = a, '...but not the member''s other devices');
  perform public.akb_member_redeem_login_link(pg_temp.h('t6'), pg_temp.h('s3'));
  perform public.akb_member_sign_out(pg_temp.h('s2'), true);
  perform pg_temp.ok(public.akb_member_session_client(pg_temp.h('s3')) is null, 'signing out everywhere ends every session');
  perform public.akb_member_redeem_login_link(pg_temp.h('t7'), pg_temp.h('s4'));
  perform pg_temp.ok(public.akb_member_end_sessions(a) = 1, 'the coach can sign a member out everywhere');
  perform pg_temp.ok(public.akb_member_session_client(pg_temp.h('s4')) is null, '...and that session is ended');
  perform public.akb_member_redeem_login_link(pg_temp.h('t8'), pg_temp.h('s5'));
  update public.akb_member_sessions set expires_at = now() - interval '1 minute' where session_hash = pg_temp.h('s5');
  perform pg_temp.ok(public.akb_member_session_client(pg_temp.h('s5')) is null, 'an expired session is nobody');

  -- Booking with credits (A: Regular, 8 credits, period starting today)
  place := public.akb_member_book_class(a, 'sat-morning', today + 3, now() + interval '3 days', 60);
  perform pg_temp.ok(place is not null, 'a member books a class with a credit');
  perform pg_temp.ok((select membership_period_id is not null from public.akb_class_attendance where id = place), 'the place is paid with a credit');
  perform pg_temp.ok(not exists (select 1 from public.akb_charges where attendance_id = place), 'no pay-as-you-go charge is raised');
  perform pg_temp.expect_error(format('select public.akb_member_book_class(%L, ''sat-morning'', %L, now() + interval ''3 days'', 60)', a, today + 3), 'akb:already_booked');
  perform pg_temp.expect_error(format('select public.akb_member_book_class(%L, ''mon-evening'', %L, now() - interval ''1 hour'', 60)', a, today), 'akb:class_started');
  perform pg_temp.expect_error(format('select public.akb_member_book_class(%L, ''mon-evening'', %L, now() + interval ''40 days'', 60)', a, today + 40), 'akb:no_membership');
  perform pg_temp.expect_error(format('select public.akb_member_book_class(%L, ''mon-evening'', %L, now() + interval ''2 days'', 60)', c, today + 2), 'akb:no_membership');
  -- Seven more places use the other seven credits; a ninth is refused.
  for i in 4..10 loop
    perform public.akb_member_book_class(a, 'mon-evening', today + i, now() + make_interval(days => i), 60);
  end loop;
  perform pg_temp.expect_error(format('select public.akb_member_book_class(%L, ''wed-evening'', %L, now() + interval ''11 days'', 60)', a, today + 11), 'akb:no_credits');
  ov := public.akb_member_overview(a);
  perform pg_temp.ok((ov #>> '{period,left}')::int = 0 and (ov #>> '{period,used}')::int = 8, 'the overview shows 8 used, 0 left');
  perform pg_temp.ok((ov #>> '{membership,renews_on}')::date = today + 28, 'the overview shows the renewal date');
  perform pg_temp.ok(jsonb_array_length(ov -> 'places') = 8, 'the overview lists the member''s places');

  -- Cancelling
  perform pg_temp.expect_error(format('select public.akb_member_cancel_place(%L, %L)', b, place), 'akb:not_found');
  late := public.akb_member_cancel_place(a, place);
  perform pg_temp.ok(late = false, 'cancelling 3 days ahead is in time');
  perform pg_temp.ok((public.akb_member_overview(a) #>> '{period,left}')::int = 1, '...and the credit comes back');
  perform pg_temp.expect_error(format('select public.akb_member_cancel_place(%L, %L)', a, place), 'akb:not_booked');
  -- Re-booking the same class uses the returned credit.
  perform pg_temp.ok(public.akb_member_book_class(a, 'sat-morning', today + 3, now() + interval '3 days', 60) = place, 're-booking a cancelled place restores it');
  perform pg_temp.ok((public.akb_member_overview(a) #>> '{period,left}')::int = 0, '...using the credit again');
  -- A class within 24 hours: cancelling is late and the credit stays used.
  perform public.akb_member_cancel_place(a, place);
  soon := public.akb_member_book_class(a, 'wed-evening', today + 1, now() + interval '20 hours', 60);
  late := public.akb_member_cancel_place(a, soon);
  perform pg_temp.ok(late = true, 'cancelling under 24 hours ahead is late');
  perform pg_temp.ok((public.akb_member_overview(a) #>> '{period,left}')::int = 0, '...and the credit is used, as the policy says');

  -- The existing class rules still apply
  update public.akb_class_sessions set cancelled_at = now() where slot = 'sat-morning' and class_date = today + 3;
  -- (Member B: A has no credits left, and the credit check runs first.)
  perform pg_temp.expect_error(format('select public.akb_member_book_class(%L, ''sat-morning'', %L, now() + interval ''3 days'', 60)', b, today + 3), 'akb:class_cancelled');
  p := public.akb_ensure_class_session('sat-morning', today + 2, now() + interval '2 days', 60);
  update public.akb_class_sessions set capacity = 1 where id = p;
  insert into public.akb_class_attendance (class_session_id, client_id) values (p, c);
  perform pg_temp.expect_error(format('select public.akb_member_book_class(%L, ''sat-morning'', %L, now() + interval ''2 days'', 60)', b, today + 2), 'akb:class_full');

  -- Housekeeping
  update public.akb_member_login_links set created_at = now() - interval '2 days', expires_at = now() - interval '2 days' + interval '15 minutes' where token_hash = pg_temp.h('t1');
  perform pg_temp.ok(public.akb_member_cleanup() >= 1, 'old links are deleted');
  perform pg_temp.ok(not exists (select 1 from public.akb_member_login_links where token_hash = pg_temp.h('t1')), '...including the used one');
end $$;

-- Nobody but the server: anon and authenticated can't read the tables or run the functions.
set local role anon;
select pg_temp.expect_error('select * from public.akb_member_sessions', 'permission denied for table akb_member_sessions');
select pg_temp.expect_error('select * from public.akb_member_login_links', 'permission denied for table akb_member_login_links');
select pg_temp.expect_error('select public.akb_member_overview(gen_random_uuid())', 'permission denied for function akb_member_overview');
reset role;
set local role authenticated;
select pg_temp.expect_error('select * from public.akb_member_sessions', 'permission denied for table akb_member_sessions');
select pg_temp.expect_error('select public.akb_member_book_class(gen_random_uuid(), ''x'', current_date, now(), 60)', 'permission denied for function akb_member_book_class');
reset role;
select 'ALL MEMBER ACCOUNT CHECKS PASSED' as result;

rollback;
