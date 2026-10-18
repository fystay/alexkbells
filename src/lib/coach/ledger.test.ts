import { beforeAll, describe, expect, it } from "vitest";
import { createClient } from "./clients";
import { select, type Db } from "./db";
import { addCharge, allocatePayment, getCharge, getPayment, listCharges, planAllocations, recordPayment, recordRefund, setPaymentStatus, voidCharge } from "./ledger";
import { testDb } from "./test-support";
import type { ClientBalance } from "./types";

let db: Db;
let sql: (q: string, p?: unknown[]) => Promise<Record<string, unknown>[]>;
let n = 0;

beforeAll(async () => {
  ({ db, sql } = await testDb());
}, 60_000);

async function newClient() {
  n += 1;
  const r = await createClient(db, { full_name: `Ledger ${n}`, email: `ledger${n}@example.com`, phone: "", instagram: "", preferred_contact: "", status: "active", notes: "" });
  if (!r.ok) throw new Error(JSON.stringify(r.error));
  return r.data.id;
}

async function charge(clientId: string, pence: number, dueOn = "2026-10-01") {
  const r = await addCharge(db, { clientId, service: "group", description: "Class", amountPence: pence, dueOn });
  if (!r.ok) throw new Error(JSON.stringify(r.error));
  return r.data.id;
}

async function pay(clientId: string, pence: number, allocations: { charge_id: string; amount_pence: number }[] = [], key = `k-${Math.random()}`) {
  return recordPayment(db, { clientId, service: "group", amountPence: pence, paidOn: "2026-10-05", method: "cash", reference: "", note: "", key, allocations });
}

async function balance(clientId: string) {
  const r = await select<ClientBalance>(db, "akb_client_balances", [["client_id", `eq.${clientId}`]]);
  if (!r.ok) throw new Error("balance");
  return r.data[0];
}

describe("payments and outstanding balances", () => {
  it("handles partial payments: two £5 payments settle a £10 charge", async () => {
    const c = await newClient();
    const ch = await charge(c, 1000);
    expect((await pay(c, 500, [{ charge_id: ch, amount_pence: 500 }])).ok).toBe(true);
    let row = await getCharge(db, ch);
    expect(row.ok && row.data).toMatchObject({ paid_pence: 500, outstanding_pence: 500 });
    expect(await balance(c)).toMatchObject({ received_pence: 500, outstanding_pence: 500, credit_pence: 0 });

    expect((await pay(c, 500, [{ charge_id: ch, amount_pence: 500 }])).ok).toBe(true);
    row = await getCharge(db, ch);
    expect(row.ok && row.data).toMatchObject({ paid_pence: 1000, outstanding_pence: 0 });
    expect(await balance(c)).toMatchObject({ received_pence: 1000, outstanding_pence: 0 });
  });

  it("never overpays a charge or over-allocates a payment, and rolls the whole payment back", async () => {
    const c = await newClient();
    const ch = await charge(c, 1000);
    const over = await pay(c, 1500, [{ charge_id: ch, amount_pence: 1500 }]);
    expect(over).toMatchObject({ ok: false, error: { kind: "rule", rule: "charge_overpaid" } });
    // All or nothing: no payment row was left behind.
    expect(await sql("select count(*)::int as n from akb_payments where client_id = $1", [c])).toEqual([{ n: 0 }]);

    const tooMuch = await pay(c, 500, [{ charge_id: ch, amount_pence: 600 }]);
    expect(tooMuch).toMatchObject({ ok: false, error: { rule: "payment_overallocated" } });
    const p = await pay(c, 500, []);
    expect(p.ok).toBe(true);
    if (!p.ok) return;
    expect(await allocatePayment(db, p.data, ch, 600)).toMatchObject({ ok: false, error: { rule: "payment_overallocated" } });
    expect((await allocatePayment(db, p.data, ch, 300)).ok).toBe(true);
    expect((await allocatePayment(db, p.data, ch, 200)).ok).toBe(true);
    const payment = await getPayment(db, p.data);
    expect(payment.ok && payment.data).toMatchObject({ allocated_pence: 500, unallocated_pence: 0 });
  });

  it("records the same submission once (idempotency key)", async () => {
    const c = await newClient();
    const first = await pay(c, 800, [], "same-key");
    const second = await pay(c, 800, [], "same-key");
    expect(first.ok && second.ok && first.data === second.data).toBe(true);
    expect(await sql("select count(*)::int as n from akb_payments where client_id = $1", [c])).toEqual([{ n: 1 }]);
  });

  it("refuses payments against another client's charge", async () => {
    const a = await newClient();
    const b = await newClient();
    const ch = await charge(a, 1000);
    expect(await pay(b, 1000, [{ charge_id: ch, amount_pence: 1000 }])).toMatchObject({ ok: false, error: { rule: "other_client" } });
  });

  it("counts unallocated money as credit, separate from outstanding", async () => {
    const c = await newClient();
    await charge(c, 1000);
    await pay(c, 2500, []);
    expect(await balance(c)).toMatchObject({ received_pence: 2500, outstanding_pence: 1000, credit_pence: 2500 });
  });

  it("separates charges due later from outstanding now", async () => {
    const c = await newClient();
    await charge(c, 1000, "2026-01-01");
    await charge(c, 700, "2099-01-01");
    expect(await balance(c)).toMatchObject({ outstanding_pence: 1000, due_later_pence: 700 });
  });

  it("plans allocations oldest first and leaves the rest as credit", () => {
    const plan = planAllocations(1500, [
      { id: "b", outstanding_pence: 1000, due_on: "2026-10-08", voided_at: null },
      { id: "a", outstanding_pence: 1000, due_on: "2026-10-01", voided_at: null },
      { id: "x", outstanding_pence: 1000, due_on: "2026-09-01", voided_at: "2026-09-02T00:00:00Z" },
    ]);
    expect(plan).toEqual({ allocations: [{ charge_id: "a", amount_pence: 1000 }, { charge_id: "b", amount_pence: 500 }], credit: 0 });
    expect(planAllocations(500, [])).toEqual({ allocations: [], credit: 500 });
  });
});

describe("refunds", () => {
  it("refunds unallocated money first, then from the chosen charge, which is owed again", async () => {
    const c = await newClient();
    const ch = await charge(c, 1000);
    const p = await pay(c, 1500, [{ charge_id: ch, amount_pence: 1000 }]);
    if (!p.ok) throw new Error("pay");
    // £5 is unallocated: refunding £5 needs no charge.
    expect((await recordRefund(db, { paymentId: p.data, amountPence: 500, refundedOn: "2026-10-06", note: "", key: "r1", chargeId: null, voidCharge: false })).ok).toBe(true);
    // £3 more must come out of the charge.
    expect(await recordRefund(db, { paymentId: p.data, amountPence: 300, refundedOn: "2026-10-06", note: "", key: "r2", chargeId: null, voidCharge: false })).toMatchObject({
      ok: false,
      error: { rule: "refund_needs_charge" },
    });
    expect((await recordRefund(db, { paymentId: p.data, amountPence: 300, refundedOn: "2026-10-06", note: "", key: "r3", chargeId: ch, voidCharge: false })).ok).toBe(true);
    const row = await getCharge(db, ch);
    expect(row.ok && row.data).toMatchObject({ paid_pence: 700, outstanding_pence: 300 });
    expect(await balance(c)).toMatchObject({ received_pence: 700, outstanding_pence: 300, credit_pence: 0 });
    // Can't refund more than was received.
    expect(await recordRefund(db, { paymentId: p.data, amountPence: 800, refundedOn: "2026-10-06", note: "", key: "r4", chargeId: ch, voidCharge: false })).toMatchObject({
      ok: false,
      error: { rule: "refund_too_large" },
    });
  });

  it("can cancel the charge with the refund, so nothing is owed", async () => {
    const c = await newClient();
    const ch = await charge(c, 1000);
    const p = await pay(c, 1000, [{ charge_id: ch, amount_pence: 1000 }]);
    if (!p.ok) throw new Error("pay");
    expect((await recordRefund(db, { paymentId: p.data, amountPence: 1000, refundedOn: "2026-10-07", note: "Class cancelled", key: "r-void", chargeId: ch, voidCharge: true })).ok).toBe(true);
    expect(await balance(c)).toMatchObject({ received_pence: 0, outstanding_pence: 0, credit_pence: 0 });
  });

  it("refuses a refund dated before the payment", async () => {
    const c = await newClient();
    const p = await pay(c, 1000, []);
    if (!p.ok) throw new Error("pay");
    expect(await recordRefund(db, { paymentId: p.data, amountPence: 100, refundedOn: "2026-10-01", note: "", key: "early", chargeId: null, voidCharge: false })).toMatchObject({
      ok: false,
      error: { rule: "refund_before_payment" },
    });
  });
});

describe("history is kept", () => {
  it("never edits or deletes payments; failed/void payments release their charges", async () => {
    const c = await newClient();
    const ch = await charge(c, 1000);
    const p = await pay(c, 1000, [{ charge_id: ch, amount_pence: 1000 }]);
    if (!p.ok) throw new Error("pay");
    await expect(sql("update akb_payments set amount_pence = 1 where id = $1", [p.data])).rejects.toThrow(/ledger_immutable/);
    await expect(sql("delete from akb_payments where id = $1", [p.data])).rejects.toThrow(/ledger_immutable/);

    expect((await setPaymentStatus(db, p.data, "failed", "Transfer bounced")).ok).toBe(true);
    const row = await getCharge(db, ch);
    expect(row.ok && row.data).toMatchObject({ paid_pence: 0, outstanding_pence: 1000 });
    expect(await balance(c)).toMatchObject({ received_pence: 0, outstanding_pence: 1000 });
    expect(await setPaymentStatus(db, p.data, "void", "")).toMatchObject({ ok: false, error: { rule: "already_decided" } });
    const log = await sql("select action from akb_events where entity_id = $1 order by id", [p.data]);
    expect(log.map((e) => e.action)).toEqual(["recorded", "failed"]);
  });

  it("voiding a charge moves its payments to credit", async () => {
    const c = await newClient();
    const ch = await charge(c, 1000);
    await pay(c, 1000, [{ charge_id: ch, amount_pence: 1000 }]);
    expect((await voidCharge(db, ch, "Free session")).ok).toBe(true);
    expect(await balance(c)).toMatchObject({ received_pence: 1000, outstanding_pence: 0, credit_pence: 1000 });
    const open = await listCharges(db, { clientId: c, openOnly: true });
    expect(open.ok && open.data).toEqual([]);
  });
});
