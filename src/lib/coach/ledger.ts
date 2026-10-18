import { inList, insert, rpc, select, selectOne, type Db, type DbResult } from "./db";
import type { Allocation, Charge, Payment, PaymentStatus, Refund, ServiceKey } from "./types";

export const SERVICE_KEYS: readonly ServiceKey[] = ["group", "pt", "online", "other"];

export function listCharges(db: Db, opts: { clientId?: string; ids?: string[]; openOnly?: boolean; dueBy?: string; packageIds?: string[]; attendanceIds?: string[]; ptSessionIds?: string[]; subscriptionId?: string } = {}): Promise<DbResult<Charge[]>> {
  const query: [string, string][] = [];
  if (opts.clientId) query.push(["client_id", `eq.${opts.clientId}`]);
  if (opts.ids) query.push(["id", inList(opts.ids)]);
  if (opts.openOnly) query.push(["outstanding_pence", "gt.0"]);
  if (opts.dueBy) query.push(["due_on", `lte.${opts.dueBy}`]);
  if (opts.packageIds) query.push(["package_id", inList(opts.packageIds)]);
  if (opts.attendanceIds) query.push(["attendance_id", inList(opts.attendanceIds)]);
  if (opts.ptSessionIds) query.push(["pt_session_id", inList(opts.ptSessionIds)]);
  if (opts.subscriptionId) query.push(["subscription_id", `eq.${opts.subscriptionId}`]);
  query.push(["order", "due_on.asc"], ["limit", "2000"]);
  return select<Charge>(db, "akb_charge_balances", query);
}

export function getCharge(db: Db, id: string): Promise<DbResult<Charge | null>> {
  return selectOne<Charge>(db, "akb_charge_balances", id);
}

export async function addCharge(db: Db, args: { clientId: string; service: ServiceKey; description: string; amountPence: number; dueOn: string }): Promise<DbResult<Charge>> {
  const result = await insert<Charge>(db, "akb_charges", {
    client_id: args.clientId,
    service: args.service,
    description: args.description,
    amount_pence: args.amountPence,
    due_on: args.dueOn,
  });
  return result.ok ? { ok: true, data: result.data[0] } : result;
}

export function voidCharge(db: Db, id: string, reason: string): Promise<DbResult<null>> {
  return rpc<null>(db, "akb_void_charge", { p_charge: id, p_reason: reason });
}

export function listPayments(db: Db, opts: { clientId?: string; from?: string; to?: string; ids?: string[]; service?: ServiceKey; status?: PaymentStatus; limit?: number } = {}): Promise<DbResult<Payment[]>> {
  const query: [string, string][] = [];
  if (opts.clientId) query.push(["client_id", `eq.${opts.clientId}`]);
  if (opts.from) query.push(["paid_on", `gte.${opts.from}`]);
  if (opts.to) query.push(["paid_on", `lte.${opts.to}`]);
  if (opts.ids) query.push(["id", inList(opts.ids)]);
  if (opts.service) query.push(["service", `eq.${opts.service}`]);
  if (opts.status) query.push(["status", `eq.${opts.status}`]);
  query.push(["order", "paid_on.desc"], ["order", "created_at.desc"], ["limit", String(opts.limit ?? 5000)]);
  return select<Payment>(db, "akb_payment_balances", mergeOrder(query));
}

/** PostgREST takes one order parameter with comma-separated terms. */
function mergeOrder(query: [string, string][]): [string, string][] {
  const orders = query.filter(([k]) => k === "order").map(([, v]) => v);
  return [...query.filter(([k]) => k !== "order"), ...(orders.length ? ([["order", orders.join(",")]] as [string, string][]) : [])];
}

export function getPayment(db: Db, id: string): Promise<DbResult<Payment | null>> {
  return selectOne<Payment>(db, "akb_payment_balances", id);
}

export function listRefunds(db: Db, opts: { paymentIds?: string[]; from?: string; to?: string } = {}): Promise<DbResult<Refund[]>> {
  const query: [string, string][] = [];
  if (opts.paymentIds) query.push(["payment_id", inList(opts.paymentIds)]);
  if (opts.from) query.push(["refunded_on", `gte.${opts.from}`]);
  if (opts.to) query.push(["refunded_on", `lte.${opts.to}`]);
  query.push(["order", "refunded_on.desc"], ["limit", "5000"]);
  return select<Refund>(db, "akb_refunds", query);
}

export function listAllocations(db: Db, opts: { paymentIds?: string[]; chargeIds?: string[] }): Promise<DbResult<Allocation[]>> {
  const query: [string, string][] = [];
  if (opts.paymentIds) query.push(["payment_id", inList(opts.paymentIds)]);
  if (opts.chargeIds) query.push(["charge_id", inList(opts.chargeIds)]);
  query.push(["limit", "5000"]);
  return select<Allocation>(db, "akb_payment_allocations", query);
}

/**
 * Records a payment and sets it against charges in one transaction. The
 * idempotency key comes from the form, so submitting the same form twice
 * records one payment.
 */
export function recordPayment(
  db: Db,
  args: {
    clientId: string;
    service: ServiceKey;
    amountPence: number;
    paidOn: string;
    method: string;
    reference: string;
    note: string;
    key: string;
    allocations: { charge_id: string; amount_pence: number }[];
  },
): Promise<DbResult<string>> {
  return rpc<string>(db, "akb_record_payment", {
    p_client: args.clientId,
    p_service: args.service,
    p_amount_pence: args.amountPence,
    p_paid_on: args.paidOn,
    p_method: args.method,
    p_reference: args.reference,
    p_note: args.note,
    p_key: args.key,
    p_allocations: args.allocations,
  });
}

export function allocatePayment(db: Db, paymentId: string, chargeId: string, amountPence: number): Promise<DbResult<null>> {
  return rpc<null>(db, "akb_allocate_payment", { p_payment: paymentId, p_charge: chargeId, p_amount_pence: amountPence });
}

export function recordRefund(
  db: Db,
  args: { paymentId: string; amountPence: number; refundedOn: string; note: string; key: string; chargeId: string | null; voidCharge: boolean },
): Promise<DbResult<string>> {
  return rpc<string>(db, "akb_record_refund", {
    p_payment: args.paymentId,
    p_amount_pence: args.amountPence,
    p_refunded_on: args.refundedOn,
    p_note: args.note,
    p_key: args.key,
    p_charge: args.chargeId,
    p_void_charge: args.voidCharge,
  });
}

export function setPaymentStatus(db: Db, id: string, status: "failed" | "void", reason: string): Promise<DbResult<null>> {
  return rpc<null>(db, "akb_set_payment_status", { p_payment: id, p_status: status, p_reason: reason });
}

/**
 * Splits a payment across a client's open charges, oldest due first (or only
 * the chosen charge). Returns the allocations and what's left as credit.
 */
export function planAllocations(amountPence: number, charges: readonly Pick<Charge, "id" | "outstanding_pence" | "due_on" | "voided_at">[]): { allocations: { charge_id: string; amount_pence: number }[]; credit: number } {
  let left = amountPence;
  const allocations: { charge_id: string; amount_pence: number }[] = [];
  for (const charge of [...charges].filter((c) => !c.voided_at && c.outstanding_pence > 0).sort((a, b) => a.due_on.localeCompare(b.due_on))) {
    if (left <= 0) break;
    const take = Math.min(left, charge.outstanding_pence);
    allocations.push({ charge_id: charge.id, amount_pence: take });
    left -= take;
  }
  return { allocations, credit: left };
}
