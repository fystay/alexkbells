import type { Charge, Package, Payment, Refund, ServiceKey, Subscription } from "./types";
import { addDays, endOfMonth, formatDate, isDateKey, startOfMonth, startOfWeek, addMonths, type DateKey } from "./time";

/**
 * The portal's money definitions, in one place (documented in ARCHITECTURE.md):
 *
 * - Payments received (cash basis): payments with status "received" dated in
 *   the period, less refunds dated in the period. Failed and void payments
 *   never count. Each payment counts once, however it is allocated.
 * - Revenue by service: the same, grouped by the service recorded on the
 *   payment (refunds follow their payment's service).
 * - Outstanding: what's still owed on charges that are due (due date on or
 *   before today) and not cancelled: amount minus the payments set against it.
 * - Expected recurring income: the monthly price of active online coaching
 *   subscriptions. A forecast, never counted as received.
 * - Package sales: price of packages sold in the period, how much of that has
 *   been paid so far, and sessions delivered from them.
 */

export const SERVICES: readonly ServiceKey[] = ["group", "pt", "online", "other"];

export interface Range {
  from: DateKey;
  to: DateKey;
}

export type Period = "week" | "month" | "last-month" | "custom";

export function inRange(date: DateKey, range: Range): boolean {
  return date >= range.from && date <= range.to;
}

/** The dates a period covers; a bad or missing custom range falls back to this month. */
export function periodRange(period: string | undefined, today: DateKey, from?: string, to?: string): Range & { period: Period; label: string } {
  if (period === "week") {
    const start = startOfWeek(today);
    return { period, from: start, to: addDays(start, 6), label: "This week" };
  }
  if (period === "last-month") {
    const start = addMonths(startOfMonth(today), -1);
    return { period, from: start, to: endOfMonth(start), label: "Last month" };
  }
  if (period === "custom" && from && to && isDateKey(from) && isDateKey(to) && from <= to) {
    return { period, from, to, label: `${formatDate(from)} – ${formatDate(to)}` };
  }
  return { period: "month", from: startOfMonth(today), to: endOfMonth(today), label: "This month" };
}

export interface Totals {
  /** Payments received in the period. */
  received: number;
  /** Refunds paid out in the period. */
  refunds: number;
  /** received − refunds. */
  net: number;
}

const zero = (): Totals => ({ received: 0, refunds: 0, net: 0 });

type LedgerPayment = Pick<Payment, "id" | "service" | "amount_pence" | "paid_on" | "status">;
type LedgerRefund = Pick<Refund, "payment_id" | "amount_pence" | "refunded_on">;

/**
 * Money received in `range`, overall and per service. `payments` must include
 * the payments of every refund passed (a refund can follow its payment by
 * months), and may include others: only those dated in range are counted.
 */
export function receivedIn(
  payments: readonly LedgerPayment[],
  refunds: readonly LedgerRefund[],
  range: Range,
  service?: ServiceKey,
): { total: Totals; byService: Record<ServiceKey, Totals> } {
  const byService = Object.fromEntries(SERVICES.map((s) => [s, zero()])) as Record<ServiceKey, Totals>;
  const byId = new Map(payments.map((p) => [p.id, p]));
  for (const p of byId.values()) {
    if (p.status !== "received" || !inRange(p.paid_on, range)) continue;
    byService[p.service].received += p.amount_pence;
  }
  for (const r of refunds) {
    const p = byId.get(r.payment_id);
    if (!p || p.status !== "received" || !inRange(r.refunded_on, range)) continue;
    byService[p.service].refunds += r.amount_pence;
  }
  const total = zero();
  for (const s of SERVICES) {
    const t = byService[s];
    t.net = t.received - t.refunds;
    if (service && s !== service) continue;
    total.received += t.received;
    total.refunds += t.refunds;
  }
  total.net = total.received - total.refunds;
  return { total, byService };
}

/** Net received per month ("YYYY-MM") and service, for the chart. */
export function monthlyNet(
  payments: readonly LedgerPayment[],
  refunds: readonly LedgerRefund[],
  months: readonly string[],
  service?: ServiceKey,
): { month: string; byService: Record<ServiceKey, number>; net: number }[] {
  return months.map((month) => {
    const from = `${month}-01`;
    const { byService, total } = receivedIn(payments, refunds, { from, to: endOfMonth(from) }, service);
    const net = Object.fromEntries(
      SERVICES.map((s) => [s, service && s !== service ? 0 : byService[s].net]),
    ) as Record<ServiceKey, number>;
    return { month, byService: net, net: total.net };
  });
}

/** Owed now: due on or before `today`, not cancelled. Charges due later are reported separately. */
export function outstanding(charges: readonly Pick<Charge, "due_on" | "voided_at" | "outstanding_pence" | "service">[], today: DateKey, service?: ServiceKey): { due: number; later: number } {
  let due = 0;
  let later = 0;
  for (const c of charges) {
    if (c.voided_at || c.outstanding_pence <= 0 || (service && c.service !== service)) continue;
    if (c.due_on <= today) due += c.outstanding_pence;
    else later += c.outstanding_pence;
  }
  return { due, later };
}

/** Monthly value of active subscriptions that haven't ended. A forecast, not money received. */
export function expectedMonthly(subscriptions: readonly Pick<Subscription, "status" | "price_pence" | "end_on">[], today: DateKey): number {
  return subscriptions
    .filter((s) => s.status === "active" && (!s.end_on || s.end_on >= today))
    .reduce((sum, s) => sum + s.price_pence, 0);
}

/** Packages sold in `range`: amount sold, amount collected so far on them, sessions delivered from them. */
export function packageSales(
  packages: readonly Pick<Package, "id" | "price_pence" | "purchased_on" | "status" | "sessions_delivered" | "sessions_total">[],
  charges: readonly Pick<Charge, "package_id" | "paid_pence" | "voided_at">[],
  range: Range,
): { count: number; sold: number; collected: number; sessionsSold: number; sessionsDelivered: number } {
  const sold = packages.filter((k) => k.status === "active" && inRange(k.purchased_on, range));
  const ids = new Set(sold.map((k) => k.id));
  return {
    count: sold.length,
    sold: sold.reduce((sum, k) => sum + k.price_pence, 0),
    collected: charges.filter((c) => c.package_id && ids.has(c.package_id)).reduce((sum, c) => sum + c.paid_pence, 0),
    sessionsSold: sold.reduce((sum, k) => sum + k.sessions_total, 0),
    sessionsDelivered: sold.reduce((sum, k) => sum + k.sessions_delivered, 0),
  };
}

/** "Paid", "Part paid", "Unpaid" or "No charge" for a booking's charge. */
export function paymentState(charge: Pick<Charge, "amount_pence" | "paid_pence" | "voided_at"> | undefined): "paid" | "part" | "unpaid" | "none" {
  if (!charge || charge.voided_at) return "none";
  if (charge.paid_pence >= charge.amount_pence) return "paid";
  return charge.paid_pence > 0 ? "part" : "unpaid";
}

export const PAYMENT_STATE_LABEL = { paid: "Paid", part: "Part paid", unpaid: "Unpaid", none: "No charge" } as const;
