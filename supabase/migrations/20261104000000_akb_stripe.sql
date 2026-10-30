-- Card payments move from Square to Stripe (owner, 2026-10-30).
--
-- The payment tables and functions keep their akb_square_* names (renaming
-- them would touch every function and view for no gain); they now hold
-- Stripe's ids: a checkout session id where a Square order id used to be, a
-- payment intent id where a payment id was. What changes here:
-- - payments are recorded with provider 'stripe' (live) or 'stripe_test' (test),
--   so test money is always distinguishable; old 'square' rows stay as they are;
-- - the live/test database guard knows the new provider names;
-- - the notes on recorded payments and refunds say Stripe.
--
-- Replaces three functions; adds and changes no table or row. Safe to run again.
-- Tests: src/lib/stripe/stripe.test.ts, src/lib/stripe/environment-guard.test.ts.

begin;

create or replace function public.akb_square_provider(p_environment text) returns text
language plpgsql immutable set search_path = public as $$
begin
  if p_environment = 'production' then return 'stripe'; end if;
  if p_environment = 'sandbox' then return 'stripe_test'; end if;
  raise exception 'akb:invalid_environment' using errcode = 'P0001';
end $$;

create or replace function public.akb_square_environment_guard() returns trigger
language plpgsql set search_path = public as $$
declare
  env text;
begin
  if tg_table_name = 'akb_payments' then
    env := case new.provider when 'stripe_test' then 'sandbox' when 'square_sandbox' then 'sandbox' when 'stripe' then 'production' when 'square' then 'production' else null end;
  else
    env := new.environment;
  end if;
  if env = 'sandbox' and public.akb_database_role() <> 'test' then
    raise exception 'akb:sandbox_in_production' using errcode = 'P0001';
  end if;
  if env = 'production' and public.akb_database_role() <> 'production' then
    raise exception 'akb:live_in_test' using errcode = 'P0001';
  end if;
  return new;
end $$;

create or replace function public.akb_apply_square_payment(
  p_environment text, p_payment_id text, p_order_id text, p_status text,
  p_amount_pence integer, p_currency text, p_paid_on date
) returns text language plpgsql set search_path = public as $$
declare
  provider_name text := public.akb_square_provider(p_environment);
  link record;
  chg record;
  pid uuid;
  owed integer;
begin
  select * into link from public.akb_square_payment_links
    where square_order_id = p_order_id and environment = p_environment for update;
  -- Not one of our links: ignored.
  if not found then return 'unknown_order'; end if;
  if p_status in ('FAILED', 'CANCELED') then return 'not_paid'; end if;
  if p_status <> 'COMPLETED' then return 'pending'; end if;
  if p_currency is distinct from 'GBP' then raise exception 'akb:currency_mismatch' using errcode = 'P0001'; end if;
  select id into pid from public.akb_payments where provider = provider_name and provider_payment_id = p_payment_id;
  if pid is not null then return 'duplicate'; end if;

  select * into chg from public.akb_charges where id = link.charge_id for update;
  insert into public.akb_payments (client_id, service, amount_pence, paid_on, method, reference, note, idempotency_key, provider, provider_payment_id)
    values (link.client_id, chg.service, p_amount_pence, p_paid_on, 'card', left(p_payment_id, 200), 'Card payment (Stripe)',
            left(provider_name || ':' || p_payment_id, 100), provider_name, p_payment_id)
    returning id into pid;
  -- Pays what's still owed on the charge; anything more (or a cancelled charge) is credit.
  if chg.voided_at is null then
    select chg.amount_pence - coalesce(sum(amount_pence), 0) into owed from public.akb_payment_allocations where charge_id = chg.id;
    if least(owed, p_amount_pence) > 0 then
      insert into public.akb_payment_allocations (payment_id, charge_id, amount_pence) values (pid, chg.id, least(owed, p_amount_pence));
    end if;
  end if;
  update public.akb_square_payment_links set status = 'paid', paid_payment_id = coalesce(paid_payment_id, pid) where id = link.id;
  insert into public.akb_events (client_id, entity, entity_id, action, detail)
    values (link.client_id, 'payment', pid, 'recorded',
            jsonb_build_object('amount_pence', p_amount_pence, 'method', 'card', 'provider', provider_name, 'charge_id', chg.id, 'provider_payment_id', p_payment_id));
  return 'recorded';
end $$;

create or replace function public.akb_apply_square_refund(
  p_environment text, p_refund_id text, p_payment_id text, p_status text,
  p_amount_pence integer, p_currency text, p_refunded_on date
) returns text language plpgsql set search_path = public as $$
declare
  provider_name text := public.akb_square_provider(p_environment);
  pay record;
  charge uuid;
  key text := left(provider_name || '-refund:' || p_refund_id, 100);
begin
  if p_status in ('REJECTED', 'FAILED') then return 'not_refunded'; end if;
  if p_status <> 'COMPLETED' then return 'pending'; end if;
  if p_currency is distinct from 'GBP' then raise exception 'akb:currency_mismatch' using errcode = 'P0001'; end if;
  select * into pay from public.akb_payments where provider = provider_name and provider_payment_id = p_payment_id;
  if not found then return 'unknown_payment'; end if;
  if exists (select 1 from public.akb_refunds where idempotency_key = key) then return 'duplicate'; end if;
  select charge_id into charge from public.akb_square_payment_links where paid_payment_id = pay.id limit 1;
  -- The charge is owed again unless the coach cancels it: the reason for a refund is theirs to record.
  perform public.akb_refund_apply(pay.id, p_amount_pence, p_refunded_on, 'Stripe refund', key, charge, false, true);
  return 'recorded';
end $$;

-- create or replace keeps each function's existing grants (service_role only).

notify pgrst, 'reload schema';

commit;
