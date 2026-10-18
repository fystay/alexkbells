import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, it } from "vitest";
import { createClient } from "./clients";
import { rpc, type Db } from "./db";
import { addCharge, getPayment, recordPayment, recordRefund, setPaymentStatus, voidCharge } from "./ledger";
import { testDb } from "./test-support";

/**
 * supabase/migrations/20261020000000_akb_payment_functions.sql, applied to a
 * database in the live project's state: everything from the portal migration
 * except these three functions.
 */
const MIGRATION = readFileSync(new URL("../../../supabase/migrations/20261020000000_akb_payment_functions.sql", import.meta.url), "utf8");
const FUNCTIONS = ["akb_void_charge", "akb_record_refund", "akb_set_payment_status"];

let db: Db;
let sql: (q: string, p?: unknown[]) => Promise<Record<string, unknown>[]>;
let exec: (script: string) => Promise<void>;
let n = 0;

async function existing() {
  const rows = await sql("select proname from pg_proc where proname = any($1) order by 1", [FUNCTIONS]);
  return rows.map((r) => r.proname);
}

beforeAll(async () => {
  ({ db, sql, exec } = await testDb());
  await sql("drop function akb_record_refund(uuid, integer, date, text, text, uuid, boolean)");
  await sql("drop function akb_void_charge(uuid, text)");
  await sql("drop function akb_set_payment_status(uuid, text, text)");
}, 60_000);

async function clientWithPayment(pence = 1000) {
  n += 1;
  const c = await createClient(db, { full_name: `Fn ${n}`, email: `fn${n}@example.com`, phone: "", instagram: "", preferred_contact: "", status: "active", notes: "" });
  if (!c.ok) throw new Error(`client ${JSON.stringify(c.error)}`);
  const ch = await addCharge(db, { clientId: c.data.id, service: "pt", description: "Session", amountPence: pence, dueOn: "2026-10-01" });
  if (!ch.ok) throw new Error("charge");
  const p = await recordPayment(db, { clientId: c.data.id, service: "pt", amountPence: pence, paidOn: "2026-10-05", method: "cash", reference: "", note: "", key: `fn-${n}`, allocations: [{ charge_id: ch.data.id, amount_pence: pence }] });
  if (!p.ok) throw new Error("payment");
  return { client: c.data.id, charge: ch.data.id, payment: p.data };
}

describe("payment functions migration", () => {
  it("reports missing functions as not set up, not as a crash", async () => {
    expect(await existing()).toEqual([]);
    const r = await rpc(db, "akb_void_charge", { p_charge: "00000000-0000-0000-0000-000000000000", p_reason: "" });
    expect(r).toMatchObject({ ok: false, error: { kind: "not-set-up" } });
  });

  it("creates all three, and running it again changes nothing", async () => {
    const before = await sql("select count(*)::int as n from akb_events");
    await exec(MIGRATION);
    await exec(MIGRATION);
    expect(await existing()).toEqual([...FUNCTIONS].sort());
    expect(await sql("select count(*)::int as n from akb_events")).toEqual(before);
  });

  it("only the server role can run them", async () => {
    const calls = [
      "select akb_void_charge('00000000-0000-0000-0000-000000000000', 'x')",
      "select akb_set_payment_status('00000000-0000-0000-0000-000000000000', 'void', 'x')",
      "select akb_record_refund('00000000-0000-0000-0000-000000000000', 1, '2026-10-05', '', 'k', null, false)",
    ];
    for (const role of ["anon", "authenticated"]) {
      for (const call of calls) {
        await sql(`set role ${role}`);
        await expect(sql(call), `${role}: ${call}`).rejects.toThrow(/permission denied/);
        await sql("reset role");
      }
    }
    // Checked directly too: anon would also be stopped later, at the tables.
    const grants = await sql(
      `select proname, has_function_privilege('anon', oid, 'EXECUTE') as anon, has_function_privilege('authenticated', oid, 'EXECUTE') as authenticated,
              has_function_privilege('service_role', oid, 'EXECUTE') as service from pg_proc where proname = any($1) order by 1`,
      [FUNCTIONS],
    );
    expect(grants).toEqual([...FUNCTIONS].sort().map((proname) => ({ proname, anon: false, authenticated: false, service: true })));
    const definers = await sql("select proname from pg_proc where proname = any($1) and prosecdef", [FUNCTIONS]);
    expect(definers).toEqual([]);
  });

  it("refunds are recorded once per key and never exceed the payment", async () => {
    const { payment, charge } = await clientWithPayment(1000);
    const args = { paymentId: payment, amountPence: 400, refundedOn: "2026-10-06", note: "", key: `refund-${payment}`, chargeId: charge, voidCharge: false };
    const first = await recordRefund(db, args);
    const again = await recordRefund(db, args);
    expect(first.ok && again.ok && first.data === again.data).toBe(true);
    expect(await sql("select count(*)::int as n from akb_refunds where payment_id = $1", [payment])).toEqual([{ n: 1 }]);
    expect(await recordRefund(db, { ...args, key: "refund-too-much", amountPence: 700 })).toMatchObject({ ok: false, error: { rule: "refund_too_large" } });
    expect(await recordRefund(db, { ...args, key: "refund-early", refundedOn: "2026-10-01", amountPence: 1 })).toMatchObject({ ok: false, error: { rule: "refund_before_payment" } });
    expect(await recordRefund(db, { ...args, paymentId: "00000000-0000-0000-0000-000000000000", key: "refund-none" })).toMatchObject({ ok: false, error: { rule: "not_found" } });
  });

  it("payment status rules: only received payments without refunds, only failed or void", async () => {
    const a = await clientWithPayment();
    expect(await setPaymentStatus(db, a.payment, "received" as "void", "")).toMatchObject({ ok: false, error: { rule: "invalid_status" } });
    expect(await setPaymentStatus(db, "00000000-0000-0000-0000-000000000000", "void", "")).toMatchObject({ ok: false, error: { rule: "not_found" } });
    expect((await setPaymentStatus(db, a.payment, "void", "Entered twice")).ok).toBe(true);
    expect(await setPaymentStatus(db, a.payment, "failed", "")).toMatchObject({ ok: false, error: { rule: "already_decided" } });
    const p = await getPayment(db, a.payment);
    expect(p.ok && p.data).toMatchObject({ status: "void", amount_pence: 1000 });

    const b = await clientWithPayment();
    await recordRefund(db, { paymentId: b.payment, amountPence: 100, refundedOn: "2026-10-06", note: "", key: `r-${b.payment}`, chargeId: b.charge, voidCharge: false });
    expect(await setPaymentStatus(db, b.payment, "void", "")).toMatchObject({ ok: false, error: { rule: "payment_has_refunds" } });
  });

  it("voiding a charge twice is harmless and logged once", async () => {
    const { charge } = await clientWithPayment();
    expect((await voidCharge(db, charge, "Free")).ok).toBe(true);
    expect((await voidCharge(db, charge, "Free")).ok).toBe(true);
    expect(await sql("select count(*)::int as n from akb_events where entity_id = $1 and action = 'voided'", [charge])).toEqual([{ n: 1 }]);
    expect(await voidCharge(db, "00000000-0000-0000-0000-000000000000", "")).toMatchObject({ ok: false, error: { rule: "not_found" } });
  });
});
