import { beforeAll, describe, expect, it } from "vitest";
import { classOccurrences } from "./classes";
import { createClient } from "./clients";
import { rpc, type Db } from "./db";
import { addCharge } from "./ledger";
import { startMembership } from "./memberships";
import { INBOX_FILTERS, loadInbox, loadMemberRows, loadOnlineRows, loadShell, loadSchedule, loadToday, matchesMemberFilter, memberFlags, messageClassLink, scheduleWeeks, stillToCome, whenLabel, type MemberRow } from "./overview";
import { addDays, londonToday, startOfWeek } from "./time";
import { testDb } from "./test-support";

const today = londonToday();
const row = (over: Partial<MemberRow> = {}): MemberRow => ({ clientId: "c", name: "Sam", plan: "Regular", payg: false, creditsLeft: 5, credits: 8, lastClass: today, periodEnd: addDays(today, 20), ...over });

describe("member filters", () => {
  it("low credits: a member with two or fewer left, never pay as you go", () => {
    expect(memberFlags(row({ creditsLeft: 2 }), today).low).toBe(true);
    expect(memberFlags(row({ creditsLeft: 3 }), today).low).toBe(false);
    expect(memberFlags(row({ payg: true, creditsLeft: 0, credits: 0, periodEnd: null }), today).low).toBe(false);
  });

  it("credits expiring: some left and the period ends within a week", () => {
    expect(memberFlags(row({ creditsLeft: 3, periodEnd: addDays(today, 7) }), today).expiring).toBe(true);
    expect(memberFlags(row({ creditsLeft: 3, periodEnd: addDays(today, 8) }), today).expiring).toBe(false);
    expect(memberFlags(row({ creditsLeft: 0, periodEnd: addDays(today, 2) }), today).expiring).toBe(false);
  });

  it("not seen for two weeks: came in the last 8 weeks, but not the last 14 days", () => {
    expect(memberFlags(row({ lastClass: addDays(today, -15) }), today).away).toBe(true);
    expect(memberFlags(row({ lastClass: addDays(today, -14) }), today).away).toBe(false);
    expect(memberFlags(row({ lastClass: null }), today).away).toBe(false);
  });

  it("filters rows", () => {
    expect(matchesMemberFilter(row({ payg: true }), "payg", today)).toBe(true);
    expect(matchesMemberFilter(row(), "payg", today)).toBe(false);
    expect(matchesMemberFilter(row(), "all", today)).toBe(true);
  });
});

describe("messaging the class", () => {
  it("opens the coach's email app with everyone in Bcc, so nobody sees the others", () => {
    const link = messageClassLink(["a@example.com", "b@example.com", "a@example.com", "not an email", ""], "Wed 28 Oct, 6:30 pm");
    expect(link.startsWith("mailto:?")).toBe(true);
    const params = new URLSearchParams(link.slice("mailto:?".length));
    expect(params.get("bcc")).toBe("a@example.com,b@example.com");
    expect(params.get("subject")).toContain("Wed 28 Oct, 6:30 pm");
    expect(link).not.toContain("+");
  });

  it("is empty when nobody booked has an email", () => {
    expect(messageClassLink(["", "nope"], "Wed")).toBe("");
  });
});

describe("times", () => {
  it("a class is still to come until it has ended", () => {
    const [occ] = classOccurrences(addDays(today, 1), addDays(today, 7));
    const start = new Date(occ.startsAt);
    expect(stillToCome(occ, new Date(start.getTime() - 3_600_000))).toBe(true);
    expect(stillToCome(occ, new Date(start.getTime() + 30 * 60_000))).toBe(true);
    expect(stillToCome(occ, new Date(start.getTime() + 61 * 60_000))).toBe(false);
  });

  it("shows UK time", () => {
    expect(whenLabel("2026-11-02T18:30:00.000Z")).toBe("Mon 2 Nov, 6:30 pm");
    expect(whenLabel("2026-10-31T09:00:00.000Z")).toBe("Sat 31 Oct, 9:00 am");
  });

  it("makes four week tabs from this week's Monday", () => {
    const weeks = scheduleWeeks("2026-10-26");
    expect(weeks.map((w) => w.start)).toEqual(["2026-10-26", "2026-11-02", "2026-11-09", "2026-11-16"]);
    expect(weeks.map((w) => w.label)).toEqual(["This week", "Next week", "", ""]);
  });
});

// The loaders against the real schema (PGlite).
let db: Db;
let sql: (q: string, p?: unknown[]) => Promise<Record<string, unknown>[]>;
let n = 0;
beforeAll(async () => {
  ({ db, sql } = await testDb());
}, 60_000);

async function client(name: string, email = `ov${++n}@example.com`) {
  const c = await createClient(db, { full_name: name, email, phone: "", instagram: "", preferred_contact: "", status: "active", notes: "" });
  if (!c.ok) throw new Error(JSON.stringify(c.error));
  return c.data.id;
}

describe("the inbox", () => {
  it("holds open requests, charges due, and coaching check-ins and messages, urgent first", async () => {
    const payer = await client("Pat Payer");
    await addCharge(db, { clientId: payer, service: "group", description: "Kettlebell training", amountPence: 1200, dueOn: today });
    await sql("insert into akb_booking_requests (idempotency_key, kind, service, summary, name, email, message) values ('ov-1', 'booking', 'One-to-one', 'Tuesdays', 'Rita Request', 'rita@example.com', 'Hello')");
    await sql("insert into akb_booking_requests (idempotency_key, kind, service, summary, name, email, message) values ('ov-2', 'online', 'Online coaching', '', 'Ollie Online', 'ollie@example.com', 'Goal: snatch')");
    const coachee = await client("Cora Coachee");
    const [sub] = await sql("insert into akb_subscriptions (client_id, plan, price_pence, start_on, status) values ($1, 'Online coaching', 7900, current_date, 'active') returning id", [coachee]);
    await sql("insert into akb_coaching_check_ins (subscription_id, week_of, energy, sleep, training, struggles) values ($1, date_trunc('week', current_date)::date, 4, 3, 5, 'Grip fades')", [sub.id]);
    await sql("insert into akb_coaching_messages (subscription_id, from_client, body) values ($1, true, 'Is Day B fine on Saturday?')", [sub.id]);

    const r = await loadInbox(db, today);
    if (!r.ok) throw new Error(JSON.stringify(r.error));
    const by = (g: string) => r.data.filter((i) => i.group === g);
    expect(by("pay")).toMatchObject([{ label: "Payment to confirm", who: "Pat Payer", action: "Mark paid" }]);
    expect(by("pay")[0].href).toContain(`/coach/finances/payments/new?client=${payer}`);
    expect(by("req").map((i) => [i.label, i.who])).toEqual([["1:1 request", "Rita Request"]]);
    expect(by("onl").map((i) => [i.label, i.who])).toEqual([["Online enquiry", "Ollie Online"]]);
    expect(by("coach").map((i) => i.label).sort()).toEqual(["Check-in to review", "Client message"]);
    expect(by("coach")[0].href).toBe(`/coach/online/${sub.id}`);
    expect(INBOX_FILTERS.map((f) => f.value)).toEqual(["all", "pay", "req", "onl", "coach"]);

    const shell = await loadShell(db, today);
    expect(shell.inbox).toBe(r.data.length);
    expect(shell.online.waiting).toBe(2);
    const online = await loadOnlineRows(db, r.data);
    expect(online.ok && online.data.find((o) => o.name === "Cora Coachee")).toMatchObject({ needsCheckIn: true, unread: true });
  });

  it("drops a coaching check-in once it has a reply", async () => {
    const id = await client("Reply Recipient");
    const [sub] = await sql("insert into akb_subscriptions (client_id, plan, price_pence, start_on, status) values ($1, 'Online coaching', 7900, current_date, 'active') returning id", [id]);
    await sql("insert into akb_coaching_check_ins (subscription_id, week_of, energy, sleep, training) values ($1, date_trunc('week', current_date)::date, 3, 3, 3)", [sub.id]);
    const before = await loadInbox(db, today);
    expect(before.ok && before.data.some((i) => i.who === "Reply Recipient")).toBe(true);
    await rpc(db, "akb_coaching_reply_check_in", { p_check_in: (await sql("select id from akb_coaching_check_ins where subscription_id = $1", [sub.id]))[0].id, p_reply: "Good week." });
    const after = await loadInbox(db, today);
    expect(after.ok && after.data.some((i) => i.who === "Reply Recipient")).toBe(false);
  });
});

describe("members", () => {
  it("lists active clients with their plan, credits and last class", async () => {
    const m = await client("Maya Member");
    const started = await startMembership(db, { clientId: m, plan: "regular", startOn: today });
    if (!started.ok) throw new Error(JSON.stringify(started.error));
    await client("Pay Go");
    const r = await loadMemberRows(db, today);
    if (!r.ok) throw new Error(JSON.stringify(r.error));
    expect(r.data.find((x) => x.name === "Maya Member")).toMatchObject({ plan: "Regular", payg: false, credits: 8, creditsLeft: 8, lastClass: null });
    expect(r.data.find((x) => x.name === "Pay Go")).toMatchObject({ plan: "Pay as you go", payg: true });
  });
});

describe("today and the schedule", () => {
  it("find the next class, who is booked, and the week", async () => {
    const [occ] = classOccurrences(today, addDays(today, 14)).filter((o) => new Date(o.startsAt) > new Date());
    const m = await client("Roster Rita");
    await startMembership(db, { clientId: m, plan: "starter", startOn: today });
    const added = await rpc<string>(db, "akb_add_attendee", { p_client: m, p_slot: occ.slot.id, p_date: occ.date, p_starts_at: occ.startsAt, p_duration: 60, p_price_pence: 0, p_description: "Class", p_request: null });
    if (!added.ok) throw new Error(JSON.stringify(added.error));
    const t = await loadToday(db, today, new Date(new Date(occ.startsAt).getTime() - 3_600_000));
    if (!t.ok) throw new Error(JSON.stringify(t.error));
    expect(t.data.next?.occurrence.date).toBe(occ.date);
    expect(t.data.next?.booked).toBe(1);
    expect(t.data.roster).toMatchObject([{ name: "Roster Rita", status: "booked", payg: false }]);
    expect(t.data.roster[0].plan).toContain("credit");

    const week = await loadSchedule(db, startOfWeek(occ.date), addDays(startOfWeek(occ.date), 6));
    if (!week.ok) throw new Error(JSON.stringify(week.error));
    expect(week.data.find((e) => e.date === occ.date && e.booked === 1)).toMatchObject({ pt: false, cancelled: false, href: `/coach/classes/${occ.date}/${occ.slot.id}` });
  });

  it("skips a class the coach cancelled", async () => {
    const upcoming = classOccurrences(today, addDays(today, 14)).filter((o) => new Date(o.startsAt) > new Date());
    const first = upcoming[0];
    const id = await rpc<string>(db, "akb_ensure_class_session", { p_slot: first.slot.id, p_date: first.date, p_starts_at: first.startsAt, p_duration: 60 });
    if (!id.ok) throw new Error(JSON.stringify(id.error));
    await rpc(db, "akb_cancel_class", { p_session: id.data, p_reason: "Coach ill" });
    const t = await loadToday(db, today, new Date(new Date(first.startsAt).getTime() - 3_600_000));
    if (!t.ok) throw new Error(JSON.stringify(t.error));
    expect(t.data.next?.occurrence.startsAt).not.toBe(first.startsAt);
  });
});
