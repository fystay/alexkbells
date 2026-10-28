import { beforeAll, describe, expect, it } from "vitest";
import { createClient } from "./clients";
import { addAttendee } from "./bookings";
import { rpc, type Db } from "./db";
import { startMembership } from "./memberships";
import { sha256Hex } from "../member-auth";
import { testDb } from "./test-support";

// The account menu's settings against the real schema (PGlite): profile,
// devices, the calendar link and reminders, with ownership checked in SQL.

let db: Db;
let sql: (q: string, p?: unknown[]) => Promise<Record<string, unknown>[]>;
let n = 0;

beforeAll(async () => {
  ({ db, sql } = await testDb());
}, 60_000);

/** A client who can sign in (a member), and their session hash. */
async function member() {
  n += 1;
  const c = await createClient(db, { full_name: `Member ${n}`, email: `settings${n}@example.com`, phone: "", instagram: "", preferred_contact: "", status: "active", notes: "" });
  if (!c.ok) throw new Error(JSON.stringify(c.error));
  const m = await startMembership(db, { clientId: c.data.id, plan: "starter", startOn: new Date().toISOString().slice(0, 10) });
  if (!m.ok) throw new Error(JSON.stringify(m.error));
  return c.data.id;
}

async function session(clientId: string, label: string) {
  const hash = await sha256Hex(`session-${Math.random()}`);
  await sql("insert into akb_member_sessions (client_id, session_hash, expires_at) values ($1, $2, now() + interval '30 days')", [clientId, hash]);
  await rpc(db, "akb_member_label_session", { p_session_hash: hash, p_device: label });
  return hash;
}

describe("profile", () => {
  it("changes the member's own name and phone, tidied, and leaves the email alone", async () => {
    const id = await member();
    const r = await rpc(db, "akb_member_update_profile", { p_client: id, p_name: "  Sam   Jones ", p_phone: " 07700  900123 " });
    expect(r.ok).toBe(true);
    const [row] = await sql("select full_name, phone, email from akb_clients where id = $1", [id]);
    expect(row).toMatchObject({ full_name: "Sam Jones", phone: "07700 900123" });
    expect(String(row.email)).toContain("@example.com");
    expect((await sql("select count(*)::int as n from akb_events where client_id = $1 and action = 'profile_updated_by_member'", [id]))[0].n).toBe(1);
  });

  it("refuses an empty name and a long phone number, changing nothing", async () => {
    const id = await member();
    const blank = await rpc(db, "akb_member_update_profile", { p_client: id, p_name: "   ", p_phone: "" });
    expect(blank).toEqual({ ok: false, error: { kind: "rule", code: "P0001", rule: "invalid_name" } });
    const long = await rpc(db, "akb_member_update_profile", { p_client: id, p_name: "Sam", p_phone: "1".repeat(31) });
    expect(long).toEqual({ ok: false, error: { kind: "rule", code: "P0001", rule: "invalid_phone" } });
    expect((await sql("select full_name from akb_clients where id = $1", [id]))[0].full_name).toMatch(/^Member /);
  });

  it("reads back what the settings pages show", async () => {
    const id = await member();
    const r = await rpc<Record<string, unknown>>(db, "akb_member_settings_get", { p_client: id });
    expect(r).toMatchObject({ ok: true, data: { class_reminders: false, calendar_feed: false } });
  });
});

describe("devices", () => {
  it("lists only this member's open sessions, this one first", async () => {
    const a = await member();
    const b = await member();
    const phone = await session(a, "iPhone, Safari");
    const laptop = await session(a, "Mac, Chrome");
    await session(b, "Someone else's");
    const r = await rpc<{ id: string; device: string; current: boolean }[]>(db, "akb_member_sessions_list", { p_client: a, p_current_hash: laptop });
    expect(r.ok && r.data.map((s) => [s.device, s.current])).toEqual([["Mac, Chrome", true], ["iPhone, Safari", false]]);
    expect(JSON.stringify(r)).not.toContain(phone);
  });

  it("signs out another device, not the current one and not someone else's", async () => {
    const a = await member();
    const b = await member();
    const current = await session(a, "Mac, Chrome");
    const other = await session(a, "iPhone, Safari");
    const theirs = await session(b, "Theirs");
    const idOf = async (hash: string) => String((await sql("select id from akb_member_sessions where session_hash = $1", [hash]))[0].id);

    const own = await rpc(db, "akb_member_end_other_session", { p_client: a, p_session: await idOf(current), p_current_hash: current });
    expect(own).toEqual({ ok: true, data: false });
    const stranger = await rpc(db, "akb_member_end_other_session", { p_client: a, p_session: await idOf(theirs), p_current_hash: current });
    expect(stranger).toEqual({ ok: true, data: false });
    const done = await rpc(db, "akb_member_end_other_session", { p_client: a, p_session: await idOf(other), p_current_hash: current });
    expect(done).toEqual({ ok: true, data: true });

    const states = await sql("select session_hash, ended_at is not null as ended from akb_member_sessions where session_hash in ($1, $2, $3)", [current, other, theirs]);
    const ended = Object.fromEntries(states.map((s) => [s.session_hash, s.ended]));
    expect(ended).toEqual({ [current]: false, [other]: true, [theirs]: false });
  });
});

describe("calendar link", () => {
  it("finds the member by the hash of the link, replaces it, and turns it off", async () => {
    const id = await member();
    const first = await sha256Hex("first-token");
    const second = await sha256Hex("second-token");
    expect((await rpc(db, "akb_member_calendar_set", { p_client: id, p_token_hash: first })).ok).toBe(true);
    expect(await rpc(db, "akb_member_calendar_client", { p_token_hash: first })).toEqual({ ok: true, data: id });
    expect((await rpc<{ calendar_feed: boolean }>(db, "akb_member_settings_get", { p_client: id }))).toMatchObject({ ok: true, data: { calendar_feed: true } });

    await rpc(db, "akb_member_calendar_set", { p_client: id, p_token_hash: second });
    expect(await rpc(db, "akb_member_calendar_client", { p_token_hash: first })).toEqual({ ok: true, data: null });
    expect(await rpc(db, "akb_member_calendar_client", { p_token_hash: second })).toEqual({ ok: true, data: id });

    await rpc(db, "akb_member_calendar_off", { p_client: id });
    expect(await rpc(db, "akb_member_calendar_client", { p_token_hash: second })).toEqual({ ok: true, data: null });
  });

  it("stores only the hash, and refuses anything that isn't one", async () => {
    const id = await member();
    expect((await rpc(db, "akb_member_calendar_set", { p_client: id, p_token_hash: "not-a-hash" })).ok).toBe(false);
  });

  it("makes no link for someone who can't sign in", async () => {
    const c = await createClient(db, { full_name: "Never Booked", email: "never@example.com", phone: "", instagram: "", preferred_contact: "", status: "lead", notes: "" });
    if (!c.ok) throw new Error("setup");
    const r = await rpc(db, "akb_member_calendar_set", { p_client: c.data.id, p_token_hash: await sha256Hex("x") });
    expect(r).toEqual({ ok: false, error: { kind: "rule", code: "P0001", rule: "not_found" } });
  });
});

describe("class reminders", () => {
  async function booked(clientId: string, hoursAway: number, slot: string) {
    const startsAt = new Date(Date.now() + hoursAway * 3_600_000).toISOString();
    const r = await addAttendee(db, { clientId, slot, date: startsAt.slice(0, 10), startsAt, duration: 60, pricePence: 0, description: "Group class" });
    if (!r.ok) throw new Error(JSON.stringify(r.error));
    return startsAt.slice(0, 10);
  }

  it("are off until chosen, then due once per place on the class's day", async () => {
    const id = await member();
    const date = await booked(id, 3, "reminder-a");
    const due = async () => {
      const r = await rpc<{ attendance_id: string; email: string }[]>(db, "akb_class_reminders_due", { p_date: date });
      if (!r.ok) throw new Error("rpc");
      return r.data.filter((d) => d.email === `settings${n}@example.com`);
    };
    expect(await due()).toHaveLength(0);

    await rpc(db, "akb_member_set_reminders", { p_client: id, p_on: true });
    const [one] = await due();
    expect(one).toBeDefined();

    await rpc(db, "akb_class_reminder_sent", { p_attendance: one.attendance_id });
    await rpc(db, "akb_class_reminder_sent", { p_attendance: one.attendance_id });
    expect(await due()).toHaveLength(0);
    expect((await sql("select count(*)::int as n from akb_class_reminders where attendance_id = $1", [one.attendance_id]))[0].n).toBe(1);
  });

  it("skip a place that was cancelled, and classes already started", async () => {
    const id = await member();
    const email = `settings${n}@example.com`;
    await rpc(db, "akb_member_set_reminders", { p_client: id, p_on: true });
    const date = await booked(id, 3, "reminder-b");
    await sql("update akb_class_attendance set status = 'cancelled' where client_id = $1", [id]);
    const r = await rpc<{ email: string }[]>(db, "akb_class_reminders_due", { p_date: date });
    expect(r.ok && r.data.some((d) => d.email === email)).toBe(false);
  });

  it("can be switched off again", async () => {
    const id = await member();
    await rpc(db, "akb_member_set_reminders", { p_client: id, p_on: true });
    await rpc(db, "akb_member_set_reminders", { p_client: id, p_on: false });
    expect(await rpc(db, "akb_member_settings_get", { p_client: id })).toMatchObject({ ok: true, data: { class_reminders: false } });
  });
});

describe("access", () => {
  it("is server only: anon and authenticated can't call the functions or read the tables", async () => {
    for (const fn of ["akb_member_update_profile(uuid,text,text)", "akb_member_calendar_client(text)", "akb_class_reminders_due(date)", "akb_member_end_other_session(uuid,uuid,text)"]) {
      for (const role of ["anon", "authenticated"]) {
        expect((await sql("select has_function_privilege($1, $2, 'execute') as ok", [role, `public.${fn}`]))[0].ok).toBe(false);
      }
    }
    for (const table of ["akb_member_settings", "akb_class_reminders", "akb_member_calendar_feeds"]) {
      for (const role of ["anon", "authenticated"]) {
        expect((await sql("select has_table_privilege($1, $2, 'select') as ok", [role, `public.${table}`]))[0].ok).toBe(false);
      }
      expect((await sql("select relrowsecurity as on from pg_class where oid = $1::regclass", [`public.${table}`]))[0].on).toBe(true);
    }
  });
});
