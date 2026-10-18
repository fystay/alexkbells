-- The coach portal's three payment-correction functions, on their own.
--
-- 20261019000000_akb_coach_portal.sql defines them too, but on the live
-- project they were never created: every other part of that migration was
-- applied (see DEPLOYMENT.md). This file is safe to run whether or not they
-- exist: it only replaces these three functions and resets their grants. It
-- creates, changes or deletes no rows, and runs as one transaction.
--
-- Rules (unchanged from the portal migration, enforced again by the ledger
-- triggers akb_allocation_rules, akb_refund_rules, akb_payments_immutable and
-- akb_refunds_immutable):
-- - Payments and refunds are never deleted; a payment changes only its status.
-- - A payment can only be marked failed/void once, while it is "received",
--   and not after any refund.
-- - A refund can't exceed what's left of the payment, and is recorded once per
--   idempotency key, even when the same request arrives twice at once.
-- - Voiding a charge releases (logs, then removes) its allocations so the money
--   returns to the client's credit. Voiding twice does nothing.

begin;

-- Cancels a charge. Money already set against it goes back to the client's
-- credit (the allocations are logged, then removed).
create or replace function public.akb_void_charge(p_charge uuid, p_reason text)
returns void language plpgsql set search_path = public as $$
declare
  chg record;
  moved jsonb;
begin
  select * into chg from public.akb_charges where id = p_charge for update;
  if not found then raise exception 'akb:not_found' using errcode = 'P0001'; end if;
  if chg.voided_at is not null then return; end if;
  select coalesce(jsonb_agg(jsonb_build_object('payment_id', payment_id, 'amount_pence', amount_pence)), '[]'::jsonb)
    into moved from public.akb_payment_allocations where charge_id = p_charge;
  delete from public.akb_payment_allocations where charge_id = p_charge;
  update public.akb_charges set voided_at = now(), void_reason = left(coalesce(p_reason, ''), 300) where id = p_charge;
  insert into public.akb_events (client_id, entity, entity_id, action, detail)
    values (chg.client_id, 'charge', p_charge, 'voided', jsonb_build_object('reason', coalesce(p_reason, ''), 'released', moved));
end $$;

-- Marks a payment failed (e.g. a bounced transfer) or void (entered in
-- error). Its allocations are logged and removed, so the charges are owed again.
create or replace function public.akb_set_payment_status(p_payment uuid, p_status text, p_reason text)
returns void language plpgsql set search_path = public as $$
declare
  pay record;
  moved jsonb;
begin
  if p_status not in ('failed', 'void') then raise exception 'akb:invalid_status' using errcode = 'P0001'; end if;
  select * into pay from public.akb_payments where id = p_payment for update;
  if not found then raise exception 'akb:not_found' using errcode = 'P0001'; end if;
  if pay.status <> 'received' then raise exception 'akb:already_decided' using errcode = 'P0001'; end if;
  if exists (select 1 from public.akb_refunds where payment_id = p_payment) then
    raise exception 'akb:payment_has_refunds' using errcode = 'P0001';
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('charge_id', charge_id, 'amount_pence', amount_pence)), '[]'::jsonb)
    into moved from public.akb_payment_allocations where payment_id = p_payment;
  delete from public.akb_payment_allocations where payment_id = p_payment;
  update public.akb_payments set status = p_status, status_reason = left(coalesce(p_reason, ''), 300) where id = p_payment;
  insert into public.akb_events (client_id, entity, entity_id, action, detail)
    values (pay.client_id, 'payment', p_payment, p_status, jsonb_build_object('reason', coalesce(p_reason, ''), 'released', moved));
end $$;

-- A refund comes out of the payment's unallocated money first; anything more
-- is taken back from its allocation to p_charge (which is then owed again,
-- unless p_void_charge cancels that charge).
-- Change from the portal migration: the payment is locked before the
-- idempotency key is checked, so two identical requests at the same moment
-- return the same refund instead of the second failing on the unique key.
create or replace function public.akb_record_refund(
  p_payment uuid, p_amount_pence integer, p_refunded_on date, p_note text, p_key text,
  p_charge uuid, p_void_charge boolean
) returns uuid language plpgsql set search_path = public as $$
declare
  pay record;
  free integer;
  take integer;
  alloc_amount integer;
  rid uuid;
begin
  -- Lock first, then read the key and balance, so two refunds can't both see the same money.
  perform 1 from public.akb_payments where id = p_payment for update;
  if not found then raise exception 'akb:not_found' using errcode = 'P0001'; end if;
  select id into rid from public.akb_refunds where idempotency_key = p_key;
  if rid is not null then return rid; end if;
  select * into pay from public.akb_payment_balances where id = p_payment;
  if pay.status <> 'received' then raise exception 'akb:payment_not_received' using errcode = 'P0001'; end if;
  free := pay.unallocated_pence;
  take := greatest(p_amount_pence - free, 0);
  if take > 0 then
    if p_charge is null then raise exception 'akb:refund_needs_charge' using errcode = 'P0001'; end if;
    select amount_pence into alloc_amount from public.akb_payment_allocations
      where payment_id = p_payment and charge_id = p_charge for update;
    if alloc_amount is null or alloc_amount < take then raise exception 'akb:refund_too_large' using errcode = 'P0001'; end if;
    if alloc_amount = take then
      delete from public.akb_payment_allocations where payment_id = p_payment and charge_id = p_charge;
    else
      update public.akb_payment_allocations set amount_pence = amount_pence - take where payment_id = p_payment and charge_id = p_charge;
    end if;
  end if;
  insert into public.akb_refunds (payment_id, amount_pence, refunded_on, note, idempotency_key)
    values (p_payment, p_amount_pence, p_refunded_on, coalesce(p_note, ''), p_key) returning id into rid;
  if p_charge is not null and p_void_charge then
    perform public.akb_void_charge(p_charge, 'Refunded');
  end if;
  insert into public.akb_events (client_id, entity, entity_id, action, detail)
    values (pay.client_id, 'payment', p_payment, 'refunded',
            jsonb_build_object('amount_pence', p_amount_pence, 'refunded_on', p_refunded_on, 'charge_id', p_charge));
  return rid;
end $$;

-- Server only: new functions are executable by PUBLIC (and, on Supabase, by
-- anon/authenticated through default privileges) unless revoked.
revoke all on function public.akb_void_charge(uuid, text) from public, anon, authenticated;
revoke all on function public.akb_set_payment_status(uuid, text, text) from public, anon, authenticated;
revoke all on function public.akb_record_refund(uuid, integer, date, text, text, uuid, boolean) from public, anon, authenticated;
grant execute on function public.akb_void_charge(uuid, text) to service_role;
grant execute on function public.akb_set_payment_status(uuid, text, text) to service_role;
grant execute on function public.akb_record_refund(uuid, integer, date, text, text, uuid, boolean) to service_role;

commit;

-- PostgREST picks up the functions.
notify pgrst, 'reload schema';
