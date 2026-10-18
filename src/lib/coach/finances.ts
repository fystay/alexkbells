import { listPackages } from "./bookings";
import { listClients } from "./clients";
import { collect, type Db, type DbError } from "./db";
import { listCharges, listPayments, listRefunds } from "./ledger";
import { listSubscriptions } from "./online";
import { expectedMonthly, monthlyNet, outstanding, packageSales, receivedIn, type Range } from "./revenue";
import { addMonths, monthsBetween, startOfMonth } from "./time";
import type { Charge, Client, Payment, Refund, ServiceKey } from "./types";

export interface FinanceData {
  range: Range;
  totals: ReturnType<typeof receivedIn>;
  months: ReturnType<typeof monthlyNet>;
  outstanding: { due: number; later: number };
  dueCharges: Charge[];
  expectedMonthly: number;
  packages: ReturnType<typeof packageSales>;
  /** Payments dated in the range (newest first). */
  payments: Payment[];
  /** Refunds dated in the range. */
  refunds: Refund[];
  /** Every payment loaded (range + chart + refunds' payments), for lookups. */
  allPayments: Payment[];
  clients: Client[];
}

/** The ledger for a period, plus 12 months for the chart. */
export async function loadFinances(db: Db, range: Range, today: string, service?: ServiceKey): Promise<{ ok: true; data: FinanceData } | { ok: false; error: DbError }> {
  const chartFrom = addMonths(startOfMonth(range.to), -11);
  const from = range.from < chartFrom ? range.from : chartFrom;
  const loaded = collect(
    await Promise.all([
      listPayments(db, { from, to: range.to }),
      listRefunds(db, { from, to: range.to }),
      listCharges(db, {}),
      listSubscriptions(db, { status: "active" }),
      listPackages(db),
      listClients(db),
    ] as const),
  );
  if (!loaded.ok) return loaded;
  const [payments, refunds, charges, subscriptions, packages, clients] = loaded.data;

  const known = new Set(payments.map((p) => p.id));
  const missing = [...new Set(refunds.map((r) => r.payment_id).filter((id) => !known.has(id)))];
  let allPayments = payments;
  if (missing.length) {
    const older = await listPayments(db, { ids: missing });
    if (!older.ok) return older;
    allPayments = [...payments, ...older.data];
  }

  const inRangePayments = payments.filter((p) => p.paid_on >= range.from && p.paid_on <= range.to && (!service || p.service === service));
  const inRangeRefunds = refunds.filter((r) => {
    const p = allPayments.find((x) => x.id === r.payment_id);
    return r.refunded_on >= range.from && r.refunded_on <= range.to && (!service || p?.service === service);
  });
  const owed = charges.filter((c) => !c.voided_at && c.outstanding_pence > 0 && (!service || c.service === service));

  return {
    ok: true,
    data: {
      range,
      totals: receivedIn(allPayments, refunds, range, service),
      months: monthlyNet(allPayments, refunds, monthsBetween(chartFrom, range.to), service),
      outstanding: outstanding(owed, today),
      dueCharges: owed.filter((c) => c.due_on <= today).sort((a, b) => a.due_on.localeCompare(b.due_on)),
      expectedMonthly: !service || service === "online" ? expectedMonthly(subscriptions, today) : 0,
      packages: packageSales(packages, charges, range),
      payments: inRangePayments,
      refunds: inRangeRefunds,
      allPayments,
      clients,
    },
  };
}
