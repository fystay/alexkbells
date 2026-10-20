import { beforeAll, describe, expect, it } from "vitest";
import { createClient, listClients } from "./clients";
import { coachDb, select, type Db } from "./db";
import { matchClients } from "./matching";
import { saveRequest } from "../request-store";
import { confirmRequest, getRequest, listRequests, relatedRequests, requestDetails, setRequestStatus } from "./requests";
import { testDb } from "./test-support";
import type { BookingRequest } from "./types";

let db: Db;
let sql: (q: string, p?: unknown[]) => Promise<Record<string, unknown>[]>;
let n = 0;

beforeAll(async () => {
  ({ db, sql } = await testDb());
}, 60_000);

/** Stores a request exactly as the public /book form does (request-store.ts). */
async function submit(person: { name: string; email: string; phone?: string }, details: Record<string, string> = {}): Promise<BookingRequest> {
  n += 1;
  const ok = await saveRequest(
    db.config,
    {
      idempotencyKey: `req-${n}-${Math.random()}`,
      kind: "booking",
      service: "Group class",
      summary: "Saturday 24 October 2026, 10:15 am",
      name: person.name,
      email: person.email,
      phone: person.phone ?? "",
      message: "",
      details: { experience: "Beginner", ...details },
    },
    db.fetchImpl,
  );
  expect(ok).toBe(true);
  const rows = await select<BookingRequest>(db, "akb_booking_requests", [["email", `eq.${person.email}`], ["order", "created_at.desc"], ["limit", "1"]]);
  if (!rows.ok) throw new Error("read");
  return rows.data[0];
}

const classBooking = { kind: "class" as const, slot: "sat-morning", date: "2026-10-24", starts_at: "2026-10-24T09:15:00.000Z", duration: 60, price_pence: 1000, description: "Kettlebell Training" };

describe("booking requests", () => {
  it("arrive as new, with the class date and slot copied from the details", async () => {
    const r = await submit({ name: "Ria New", email: "ria@example.com" }, { classDate: "2026-10-24", classSlot: "sat-morning" });
    expect(r).toMatchObject({ status: "new", client_id: null, class_date: "2026-10-24", class_slot: "sat-morning" });
    expect(requestDetails(r)).toMatchObject({ experience: "Beginner", classDate: "2026-10-24", classSlot: "sat-morning" });
  });

  it("confirming creates one client, books the class and charges it, all at once", async () => {
    const r = await submit({ name: "Cal Confirm", email: "cal@example.com", phone: "07700 900111" }, { classDate: "2026-10-24", classSlot: "sat-morning" });
    const result = await confirmRequest(db, { requestId: r.id, clientId: null, newClient: { full_name: r.name, email: r.email, phone: r.phone }, booking: classBooking, note: "See you Saturday" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const after = await getRequest(db, r.id);
    expect(after.ok && after.data).toMatchObject({ status: "confirmed", client_id: result.data.client_id, decision_note: "See you Saturday" });
    expect(await sql("select status from akb_clients where id = $1", [result.data.client_id])).toEqual([{ status: "active" }]);
    expect(await sql("select count(*)::int as n from akb_class_attendance where request_id = $1", [r.id])).toEqual([{ n: 1 }]);
    expect(await sql("select kind from akb_client_consents where client_id = $1", [result.data.client_id])).toEqual([{ kind: "privacy_notice" }]);

    // Confirming again (double click, second tab) changes nothing.
    expect(await confirmRequest(db, { requestId: r.id, clientId: result.data.client_id, newClient: null, booking: classBooking, note: "" })).toMatchObject({
      ok: false,
      error: { rule: "already_decided" },
    });
  });

  it("links a returning client's request by exact email, so no duplicate client is made", async () => {
    const first = await submit({ name: "Ros Return", email: "ros@example.com" });
    const confirmed = await confirmRequest(db, { requestId: first.id, clientId: null, newClient: { full_name: "Ros Return", email: "ros@example.com", phone: "" }, booking: { kind: "none" }, note: "" });
    if (!confirmed.ok) throw new Error(JSON.stringify(confirmed.error));
    const second = await submit({ name: "Ros R", email: "ROS@example.com" });
    expect(second.client_id).toBe(confirmed.data.client_id);
    const related = await relatedRequests(db, second);
    expect(related.ok && related.data.map((x) => x.id)).toEqual([first.id]);

    // Trying to create a second client with that email is refused.
    const dup = await confirmRequest(db, { requestId: second.id, clientId: null, newClient: { full_name: "Ros R", email: "ros@EXAMPLE.com", phone: "" }, booking: { kind: "none" }, note: "" });
    expect(dup).toMatchObject({ ok: false, error: { kind: "conflict", constraint: "akb_clients_email_key" } });
    // And the request is left as it was.
    const still = await getRequest(db, second.id);
    expect(still.ok && still.data?.status).toBe("new");
    expect(await sql("select count(*)::int as n from akb_clients where lower(email) = 'ros@example.com'")).toEqual([{ n: 1 }]);
  });

  it("only suggests (never links) a match on phone or name", async () => {
    const existing = await createClient(db, { full_name: "Max Match", email: "max@example.com", phone: "+44 7700 900222", instagram: "", preferred_contact: "", status: "active", notes: "" });
    if (!existing.ok) throw new Error("client");
    const r = await submit({ name: "max match", email: "max.other@example.com", phone: "07700 900222" });
    expect(r.client_id).toBeNull();
    const clients = await listClients(db);
    if (!clients.ok) throw new Error("clients");
    const match = matchClients({ name: r.name, email: r.email, phone: r.phone }, clients.data);
    expect(match.exact).toBeNull();
    expect(match.possible.map((p) => [p.client.id, p.reasons])).toEqual([[existing.data.id, ["phone", "name"]]]);
  });

  it("adding a client picks up their earlier requests by email", async () => {
    const r = await submit({ name: "Lee Later", email: "lee@example.com" });
    const c = await createClient(db, { full_name: "Lee Later", email: "Lee@Example.com", phone: "", instagram: "", preferred_contact: "", status: "lead", notes: "" });
    if (!c.ok) throw new Error("client");
    const after = await getRequest(db, r.id);
    expect(after.ok && after.data?.client_id).toBe(c.data.id);
  });

  it("moves through awaiting, declined, cancelled and completed only from sensible states", async () => {
    const r = await submit({ name: "Dee Decline", email: "dee-decline@example.com" });
    expect((await setRequestStatus(db, r.id, "awaiting", "Asked about times")).ok).toBe(true);
    const declined = await setRequestStatus(db, r.id, "declined", "Class full");
    expect(declined.ok && declined.data).toMatchObject({ status: "declined", decision_note: "Class full" });
    // Declined can't become completed or awaiting; the update matches nothing.
    expect(await setRequestStatus(db, r.id, "completed", "")).toEqual({ ok: true, data: null });
    expect(await setRequestStatus(db, r.id, "awaiting", "")).toEqual({ ok: true, data: null });
    const open = await listRequests(db, { filter: "open" });
    expect(open.ok && open.data.some((x) => x.id === r.id)).toBe(false);
    const byStatus = await listRequests(db, { filter: "declined" });
    expect(byStatus.ok && byStatus.data.map((x) => x.id)).toContain(r.id);
  });

  it("finds requests by search text", async () => {
    await submit({ name: "Searchable Sue", email: "sue@example.com" });
    const found = await listRequests(db, { q: "searchable" });
    expect(found.ok && found.data.map((x) => x.name)).toEqual(["Searchable Sue"]);
    // Characters that would change the query are removed.
    const odd = await listRequests(db, { q: "sue),status.eq.new" });
    expect(odd.ok).toBe(true);
  });
});

describe("access", () => {
  it("public roles can't read or write any portal table, view or function", async () => {
    const relations = [
      "akb_booking_requests", "akb_clients", "akb_client_consents", "akb_follow_ups", "akb_events", "akb_class_sessions",
      "akb_class_attendance", "akb_packages", "akb_pt_sessions", "akb_subscriptions", "akb_check_ins", "akb_charges",
      "akb_payments", "akb_payment_allocations", "akb_refunds", "akb_charge_balances", "akb_payment_balances",
      "akb_package_balances", "akb_client_balances", "akb_class_overview",
    ];
    for (const role of ["anon", "authenticated"]) {
      for (const relation of relations) {
        await sql(`set role ${role}`);
        await expect(sql(`select * from ${relation} limit 1`), `${role} ${relation}`).rejects.toThrow(/permission denied/);
        await sql("reset role");
      }
      await sql(`set role ${role}`);
      await expect(sql("select akb_void_charge('00000000-0000-0000-0000-000000000000', 'x')")).rejects.toThrow(/permission denied/);
      await sql("reset role");
    }
    const rls = await sql("select relname from pg_class where relname like 'akb\\_%' and relkind = 'r' and not relrowsecurity");
    expect(rls).toEqual([]);
  });

  it("the portal is off without the server-side Supabase settings", () => {
    expect(coachDb({})).toBeNull();
    expect(coachDb({ SUPABASE_URL: "http://example.com", SUPABASE_SECRET_KEY: "k" })).toBeNull();
    expect(coachDb({ SUPABASE_URL: "https://x.supabase.co", SUPABASE_SECRET_KEY: "k" })).not.toBeNull();
  });
});
