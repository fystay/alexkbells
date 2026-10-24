import { beforeAll, describe, expect, it } from "vitest";
import { addAttendee, cancelClass, getClassSession, setAttendance } from "./bookings";
import { createClient } from "./clients";
import { select, type Db } from "./db";
import { addCharge } from "./ledger";
import { currentPeriods, listMemberships, listPeriods, periodOn, renewMemberships, returnCredit, setMembershipStatus, startMembership, payWithCredit } from "./memberships";
import { testDb } from "./test-support";

// Memberships against the real schema (PGlite): periods, charges, credits and
// the 24-hour cancellation rule, all enforced by the database.

let db: Db;
let sql: (q: string, p?: unknown[]) => Promise<Record<string, unknown>[]>;
let n = 0;

beforeAll(async () => {
  ({ db, sql } = await testDb());
}, 60_000);

async function newClient() {
  n += 1;
  const r = await createClient(db, { full_name: `Member ${n}`, email: `member${n}@example.com`, phone: "", instagram: "", preferred_contact: "", status: "active", notes: "" });
  if (!r.ok) throw new Error(JSON.stringify(r.error));
  return r.data.id;
}

const day = (offset: number) => new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);

/** A class place on a date; the class starts `hoursAway` from now when given (for the 24-hour rule). */
async function place(clientId: string, date: string, opts: { hoursAway?: number; slot?: string; price?: number } = {}) {
  const startsAt = opts.hoursAway !== undefined ? new Date(Date.now() + opts.hoursAway * 3_600_000).toISOString() : `${date}T18:30:00Z`;
  const r = await addAttendee(db, { clientId, slot: opts.slot ?? `slot-${Math.random()}`, date, startsAt, duration: 60, pricePence: opts.price ?? 0, description: "Group class" });
  if (!r.ok) throw new Error(JSON.stringify(r.error));
  return r.data;
}

async function start(clientId: string, plan: "starter" | "regular" | "dedicated" = "starter", startOn = day(0)) {
  const r = await startMembership(db, { clientId, plan, startOn });
  if (!r.ok) throw new Error(JSON.stringify(r.error));
  return r.data;
}

async function periods(membershipId: string) {
  const r = await listPeriods(db, [membershipId]);
  if (!r.ok) throw new Error(JSON.stringify(r.error));
  return r.data;
}

describe("memberships", () => {
  it("starts on the published plan: first four-week period, its credits and one charge", async () => {
    const c = await newClient();
    const m = await start(c, "regular", "2026-11-02");
    const [p] = await periods(m);
    expect(p).toMatchObject({ period_start: "2026-11-02", period_end: "2026-11-29", credits: 8, credits_used: 0, credits_left: 8, plan_name: "Regular" });
    const [charge] = await sql("select amount_pence, due_on::text, service, description from akb_charges where id = $1", [p.charge_id]);
    expect(charge).toEqual({ amount_pence: 6500, due_on: "2026-11-02", service: "group", description: "Regular membership, 2 Nov to 29 Nov 2026" });
  });

  it("allows one current membership per person", async () => {
    const c = await newClient();
    await start(c);
    const again = await startMembership(db, { clientId: c, plan: "dedicated", startOn: day(0) });
    expect(again).toMatchObject({ ok: false, error: { kind: "conflict" } });
  });

  it("refuses a plan that isn't published", async () => {
    const c = await newClient();
    // @ts-expect-error: not a plan id
    expect(await startMembership(db, { clientId: c, plan: "platinum", startOn: day(0) })).toMatchObject({ ok: false, error: { kind: "invalid" } });
  });

  it("renews every four weeks, once: running the renewal again creates nothing", async () => {
    const c = await newClient();
    const m = await start(c, "starter", "2026-09-07");
    // Started 7 Sep; by 30 Oct the period from 5 Oct has begun, the one from 2 Nov hasn't.
    const made = await renewMemberships(db, "2026-10-30");
    expect(made.ok && made.data).toBeGreaterThanOrEqual(1);
    expect((await periods(m)).map((p) => p.period_start)).toEqual(["2026-10-05", "2026-09-07"]);
    const again = await renewMemberships(db, "2026-10-30");
    expect(again.ok && (await periods(m)).length).toBe(2);
    const charges = await sql("select count(*)::int as n from akb_membership_periods p join akb_charges c on c.id = p.charge_id where p.membership_id = $1", [m]);
    expect(charges).toEqual([{ n: 2 }]);
  });

  it("stops renewing when paused or cancelled, and resumes from the resume date", async () => {
    const c = await newClient();
    const m = await start(c, "starter", "2026-08-03");
    expect((await setMembershipStatus(db, m, "paused", "2026-08-20")).ok).toBe(true);
    await renewMemberships(db, "2026-10-01");
    expect(await periods(m)).toHaveLength(1);
    expect((await setMembershipStatus(db, m, "active", "2026-10-01")).ok).toBe(true);
    await renewMemberships(db, "2026-10-01");
    expect((await periods(m)).map((p) => p.period_start)).toEqual(["2026-10-01", "2026-08-03"]);
    expect((await setMembershipStatus(db, m, "cancelled", "2026-10-10")).ok).toBe(true);
    await renewMemberships(db, "2026-12-31");
    expect(await periods(m)).toHaveLength(2);
    const [row] = (await listMemberships(db, { clientId: c })).ok ? ((await listMemberships(db, { clientId: c })) as { ok: true; data: { status: string; cancelled_on: string }[] }).data : [];
    expect(row).toMatchObject({ status: "cancelled", cancelled_on: "2026-10-10" });
    expect(await setMembershipStatus(db, m, "active", "2026-10-11")).toMatchObject({ ok: false, error: { rule: "membership_cancelled" } });
  });
});

describe("class credits", () => {
  it("pays for places with credits until they run out", async () => {
    const c = await newClient();
    const m = await start(c, "starter"); // 4 credits
    for (let i = 0; i < 4; i++) expect((await payWithCredit(db, await place(c, day(1 + i)))).ok).toBe(true);
    const fifth = await payWithCredit(db, await place(c, day(6)));
    expect(fifth).toMatchObject({ ok: false, error: { rule: "no_credits" } });
    expect((await periods(m))[0]).toMatchObject({ credits_used: 4, credits_left: 0 });
  });

  it("only within the period: credits don't roll over or reach other people's places", async () => {
    const c = await newClient();
    const other = await newClient();
    await start(c, "starter");
    expect(await payWithCredit(db, await place(c, day(40)))).toMatchObject({ ok: false, error: { rule: "no_membership" } });
    expect(await payWithCredit(db, await place(other, day(1)))).toMatchObject({ ok: false, error: { rule: "no_membership" } });
    // Linking someone else's period directly is refused by the database too.
    const [p] = await sql("select p.id from akb_membership_periods p join akb_memberships m on m.id = p.membership_id where m.client_id = $1", [c]);
    const theirs = await place(other, day(2));
    await expect(sql("update akb_class_attendance set membership_period_id = $1 where id = $2", [p.id, theirs])).rejects.toThrow(/credit_not_theirs/);
  });

  it("24-hour rule: cancelling in time returns the credit, late or missed forfeits it, the coach can give it back", async () => {
    const c = await newClient();
    const m = await start(c, "starter");
    const early = await place(c, day(3), { hoursAway: 72 });
    const late = await place(c, day(0), { hoursAway: 5 });
    const missed = await place(c, day(1), { hoursAway: 30 });
    for (const a of [early, late, missed]) expect((await payWithCredit(db, a)).ok).toBe(true);
    expect((await periods(m))[0].credits_used).toBe(3);

    await setAttendance(db, early, "cancelled");
    await setAttendance(db, late, "cancelled");
    await setAttendance(db, missed, "no_show");
    const flags = await sql("select id, late_cancel from akb_class_attendance where id = any($1::uuid[])", [[early, late]]);
    expect(Object.fromEntries(flags.map((f) => [f.id, f.late_cancel]))).toEqual({ [early]: false, [late]: true });
    expect((await periods(m))[0]).toMatchObject({ credits_used: 2, credits_left: 2 }); // late + missed

    expect((await returnCredit(db, late)).ok).toBe(true);
    expect((await periods(m))[0]).toMatchObject({ credits_used: 1, credits_left: 3 });
  });

  it("cancels an unpaid pay-as-you-go charge when the place is moved onto a credit", async () => {
    const c = await newClient();
    await start(c, "starter");
    const a = await place(c, day(2), { price: 1200 });
    expect((await payWithCredit(db, a)).ok).toBe(true);
    const [charge] = await sql("select voided_at is not null as voided, void_reason from akb_charges where attendance_id = $1", [a]);
    expect(charge).toEqual({ voided: true, void_reason: "Paid with a membership credit" });
    // Using the credit again is a no-op, not a second credit.
    expect((await payWithCredit(db, a)).ok).toBe(true);
    const p = await periodOn(db, c, day(2));
    expect(p.ok && p.data?.credits_used).toBe(1);
  });

  it("keeps an extra charge raised by hand (it isn't tied to the place)", async () => {
    const c = await newClient();
    await start(c, "starter");
    const extra = await addCharge(db, { clientId: c, service: "group", description: "Extra class", amountPence: 1200, dueOn: day(1) });
    expect(extra.ok).toBe(true);
    const a = await place(c, day(1));
    expect((await payWithCredit(db, a)).ok).toBe(true);
    const r = await select<{ voided_at: string | null }>(db, "akb_charges", [["id", `eq.${extra.ok ? extra.data.id : ""}`]]);
    expect(r.ok && r.data[0].voided_at).toBeNull();
  });
});

describe("the coach cancels a whole class", () => {
  it("cancels every place, returns members' credits even inside 24 hours, cancels unpaid charges and closes the class", async () => {
    const member = await newClient();
    const payg = await newClient();
    const m = await start(member, "starter");
    const slot = `cancel-${Math.random()}`;
    const onCredit = await place(member, day(0), { hoursAway: 3, slot });
    expect((await payWithCredit(db, onCredit)).ok).toBe(true);
    const paying = await place(payg, day(0), { hoursAway: 3, slot, price: 1200 });
    expect((await periods(m))[0].credits_used).toBe(1);

    const session = await getClassSession(db, slot, day(0));
    expect(session.ok && session.data).toBeTruthy();
    const id = session.ok && session.data ? session.data.id : "";
    expect(await cancelClass(db, id, "Venue closed")).toEqual({ ok: true, data: 2 });

    const rows = await sql("select id, status, late_cancel from akb_class_attendance where id = any($1::uuid[])", [[onCredit, paying]]);
    expect(rows.every((r) => r.status === "cancelled" && r.late_cancel === false)).toBe(true);
    expect((await periods(m))[0]).toMatchObject({ credits_used: 0, credits_left: 4 });
    const [charge] = await sql("select voided_at is not null as voided from akb_charges where attendance_id = $1", [paying]);
    expect(charge).toEqual({ voided: true });

    const after = await getClassSession(db, slot, day(0));
    expect(after.ok && after.data).toMatchObject({ cancel_reason: "Venue closed" });
    expect(after.ok && after.data?.cancelled_at).toBeTruthy();
    // Nobody can be booked onto it again, or put back on it.
    const late = await addAttendee(db, { clientId: await newClient(), slot, date: day(0), startsAt: new Date(Date.now() + 3 * 3_600_000).toISOString(), duration: 60, pricePence: 1200, description: "Group class" });
    expect(late).toMatchObject({ ok: false, error: { rule: "class_cancelled" } });
    expect(await setAttendance(db, paying, "booked")).toMatchObject({ ok: false, error: { rule: "class_cancelled" } });
    // Cancelling again changes nothing.
    expect(await cancelClass(db, id, "")).toEqual({ ok: true, data: 0 });
  });
});

describe("current periods", () => {
  it("lists every period covering a date, with credits left", async () => {
    const c = await newClient();
    await start(c, "regular");
    const r = await currentPeriods(db, day(0));
    expect(r.ok && r.data.find((p) => p.client_id === c)).toMatchObject({ credits: 8, credits_left: 8 });
  });
});
