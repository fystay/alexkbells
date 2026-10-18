import { beforeAll, describe, expect, it } from "vitest";
import { insert, rpc, select, update, type Db } from "./db";
import { testDb } from "./test-support";

let db: Db;
let sql: (q: string, p?: unknown[]) => Promise<Record<string, unknown>[]>;

beforeAll(async () => {
  ({ db, sql } = await testDb());
}, 60_000);

async function client(name: string, email = "") {
  const r = await insert<{ id: string }>(db, "akb_clients", { full_name: name, email });
  if (!r.ok) throw new Error(JSON.stringify(r.error));
  return r.data[0].id;
}

describe("schema smoke", () => {
  it("creates a client and reads it back", async () => {
    const id = await client("Sam Smoke", "sam@example.com");
    const r = await select<{ id: string; status: string }>(db, "akb_clients", [["id", `eq.${id}`]]);
    expect(r.ok && r.data[0].status).toBe("lead");
  });

  it("rejects a duplicate email regardless of case", async () => {
    await client("Dee One", "dee@example.com");
    const r = await insert(db, "akb_clients", { full_name: "Dee Two", email: "DEE@example.com" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.kind).toBe("conflict");
  });

  it("maps rule errors", async () => {
    const r = await rpc(db, "akb_set_payment_status", { p_payment: "00000000-0000-0000-0000-000000000000", p_status: "void", p_reason: "" });
    expect(r).toEqual({ ok: false, error: { kind: "rule", code: "P0001", rule: "not_found" } });
  });

  it("updates one column", async () => {
    const id = await client("Pat Update");
    const r = await update<{ status: string }>(db, "akb_clients", [["id", `eq.${id}`]], { status: "active" });
    expect(r.ok && r.data[0].status).toBe("active");
    expect((await sql("select status from akb_clients where id = $1", [id]))[0].status).toBe("active");
  });
});
