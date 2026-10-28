import { beforeAll, describe, expect, it } from "vitest";
import { createClient } from "./clients";
import { rpc, type Db } from "./db";
import { testDb } from "./test-support";
import { parseProgramme } from "./programme-text";
import { coachingOverview, coachingStatus, logSession, markCoachingRead, sendCoachingMessage, submitCheckIn, type CoachingOverview, type CoachingStatus } from "../coaching";

// Raeng Coaching against the real schema (PGlite): who has it, the programme,
// logging, check-ins and messages, with ownership checked in SQL.

let db: Db;
let sql: (q: string, p?: unknown[]) => Promise<Record<string, unknown>[]>;
let n = 0;

beforeAll(async () => {
  ({ db, sql } = await testDb());
}, 60_000);

async function client(email = `coach${++n}@example.com`) {
  const c = await createClient(db, { full_name: `Client ${n}`, email, phone: "", instagram: "", preferred_contact: "", status: "active", notes: "" });
  if (!c.ok) throw new Error(JSON.stringify(c.error));
  return c.data.id;
}

async function subscription(clientId: string, status = "active") {
  const r = await sql("insert into akb_subscriptions (client_id, plan, price_pence, start_on, status) values ($1, 'Online coaching', 7900, current_date, $2) returning id", [clientId, status]);
  return String(r[0].id);
}

const PROGRAMME = `Week 1
Day A
Two-hand swing | 3 | 10 | 24 kg
Strict press | 2 | 5 each | 16 kg
Day B
Snatch | 4 | 5 each | 16 kg`;

async function saveProgramme(sub: string, text = PROGRAMME, startsOn = "2020-01-01") {
  const parsed = parseProgramme(text, 6);
  if (!parsed.ok) throw new Error(parsed.error);
  return rpc<string>(db, "akb_coaching_save_programme", { p_subscription: sub, p_name: "Snatch prep", p_goal: "First 24 kg snatch", p_weeks: 6, p_days_per_week: 2, p_starts_on: startsOn, p_items: parsed.items });
}

async function active(clientId: string) {
  const r = await coachingOverview(db, clientId);
  if (!r.ok || !r.data.active) throw new Error("not active");
  return r.data as Extract<CoachingOverview, { active: true }>;
}

describe("who has coaching", () => {
  it("is nobody without an active subscription, and an active subscription can sign in", async () => {
    const id = await client();
    expect(await coachingStatus(db, id)).toEqual({ ok: true, data: { active: false } });
    expect((await sql("select akb_can_sign_in($1) as ok", [id]))[0].ok).toBe(false);
    await subscription(id);
    const status = await coachingStatus(db, id);
    expect(status).toMatchObject({ ok: true, data: { active: true, plan: "Online coaching", price_pence: 7900, programme: null, unread: 0, check_in_sent: false } });
    expect((await sql("select akb_can_sign_in($1) as ok", [id]))[0].ok).toBe(true);
  });

  it("is off for a paused or cancelled subscription", async () => {
    const id = await client();
    await subscription(id, "paused");
    expect(await coachingStatus(db, id)).toEqual({ ok: true, data: { active: false } });
  });
});

describe("the programme", () => {
  it("is written by the coach, and the member sees this week's exercises", async () => {
    const id = await client();
    const sub = await subscription(id);
    expect((await saveProgramme(sub)).ok).toBe(true);
    const o = await active(id);
    expect(o.programme).toMatchObject({ name: "Snatch prep", weeks: 6, week: 6, goal: "First 24 kg snatch" });
    expect(o.programme!.items.filter((i) => i.week === 1)).toHaveLength(3);
    const s = (await coachingStatus(db, id)) as { ok: true; data: Extract<CoachingStatus, { active: true }> };
    expect(s.data.programme).toMatchObject({ name: "Snatch prep", week: 6, weeks: 6 });
  });

  it("is on week 1 before it starts, and the week moves on every seven days", async () => {
    const id = await client();
    const sub = await subscription(id);
    await saveProgramme(sub, PROGRAMME, new Date(Date.now() + 5 * 86_400_000).toISOString().slice(0, 10));
    expect((await active(id)).programme!.week).toBe(1);
    await saveProgramme(sub, PROGRAMME, new Date(Date.now() - 8 * 86_400_000).toISOString().slice(0, 10));
    expect((await active(id)).programme!.week).toBe(2);
  });

  it("rewriting it keeps what was logged", async () => {
    const id = await client();
    const sub = await subscription(id);
    await saveProgramme(sub);
    const o = await active(id);
    const swing = o.programme!.items.find((i) => i.week === 1 && i.name === "Two-hand swing")!;
    await logSession(db, id, 1, "Day A", "", [{ item_id: swing.id, set_no: 1, load: "24", reps: "10", done: true }]);
    await saveProgramme(sub, PROGRAMME.replace("24 kg", "28 kg"));
    const after = await active(id);
    expect(after.logs[0].sets[0]).toMatchObject({ item_name: "Two-hand swing", load: "24", done: true });
    expect((await sql("select count(*)::int as n from akb_coaching_items i join akb_coaching_programmes p on p.id = i.programme_id where p.subscription_id = $1", [sub]))[0].n).toBe(18);
  });
});

describe("logging a session", () => {
  it("saves the sets, and logging the day again replaces it", async () => {
    const id = await client();
    await saveProgramme(await subscription(id));
    const o = await active(id);
    const items = o.programme!.items.filter((i) => i.week === 1 && i.day === "Day A");
    const sets = items.flatMap((i) => Array.from({ length: i.sets }, (_, s) => ({ item_id: i.id, set_no: s + 1, load: "24", reps: "10", done: s === 0 })));
    expect((await logSession(db, id, 1, "Day A", "Felt good", sets)).ok).toBe(true);
    let log = (await active(id)).logs[0];
    expect(log).toMatchObject({ week: 1, day: "Day A", note: "Felt good" });
    expect(log.sets).toHaveLength(5);
    expect(log.sets.filter((s) => s.done)).toHaveLength(2);
    await logSession(db, id, 1, "Day A", "Again", sets.slice(0, 1));
    log = (await active(id)).logs[0];
    expect((await active(id)).logs).toHaveLength(1);
    expect(log).toMatchObject({ note: "Again" });
    expect(log.sets).toHaveLength(1);
  });

  it("refuses a day or week that isn't in the programme, and a bad payload", async () => {
    const id = await client();
    await saveProgramme(await subscription(id));
    expect(await logSession(db, id, 1, "Day Z", "", [])).toEqual({ ok: false, error: { kind: "rule", code: "P0001", rule: "invalid_day" } });
    expect(await logSession(db, id, 9, "Day A", "", [])).toEqual({ ok: false, error: { kind: "rule", code: "P0001", rule: "invalid_week" } });
    expect((await rpc(db, "akb_coaching_log_session", { p_client: id, p_week: 1, p_day: "Day A", p_note: "", p_sets: { not: "an array" } })).ok).toBe(false);
  });

  it("ignores sets that belong to someone else's programme", async () => {
    const mine = await client();
    const theirs = await client();
    await saveProgramme(await subscription(mine));
    await saveProgramme(await subscription(theirs));
    const other = (await active(theirs)).programme!.items.find((i) => i.week === 1 && i.day === "Day A")!;
    await logSession(db, mine, 1, "Day A", "", [{ item_id: other.id, set_no: 1, load: "99", reps: "99", done: true }]);
    expect((await active(mine)).logs[0].sets).toHaveLength(0);
  });

  it("is for clients with coaching only", async () => {
    const id = await client();
    expect(await logSession(db, id, 1, "Day A", "", [])).toEqual({ ok: false, error: { kind: "rule", code: "P0001", rule: "not_found" } });
  });
});

describe("check-ins", () => {
  const input = { energy: 4, sleep: 3, training: 5, wins: "All three", struggles: "Grip", video: "https://youtu.be/x.y" };

  it("one a week, scored 1 to 5, with a link only", async () => {
    const id = await client();
    await subscription(id);
    expect((await submitCheckIn(db, id, input)).ok).toBe(true);
    expect(await submitCheckIn(db, id, input)).toEqual({ ok: false, error: { kind: "rule", code: "P0001", rule: "already_sent" } });
    const o = await active(id);
    expect(o.check_in_sent).toBe(true);
    expect(o.check_ins[0]).toMatchObject({ energy: 4, sleep: 3, training: 5, wins: "All three", coach_reply: null });
  });

  it("refuses scores outside 1 to 5 and a video that isn't a link", async () => {
    const id = await client();
    await subscription(id);
    expect(await submitCheckIn(db, id, { ...input, energy: 6 })).toEqual({ ok: false, error: { kind: "rule", code: "P0001", rule: "invalid_score" } });
    expect(await submitCheckIn(db, id, { ...input, video: "javascript:alert(1)" })).toEqual({ ok: false, error: { kind: "rule", code: "P0001", rule: "invalid_video" } });
  });

  it("shows the coach's reply to the member", async () => {
    const id = await client();
    await subscription(id);
    await submitCheckIn(db, id, input);
    const checkIn = (await active(id)).check_ins[0];
    expect((await rpc(db, "akb_coaching_reply_check_in", { p_check_in: checkIn.id, p_reply: "Good week." })).ok).toBe(true);
    expect((await active(id)).check_ins[0]).toMatchObject({ coach_reply: "Good week." });
  });
});

describe("messages", () => {
  it("go both ways; the member's unread count clears when they open Messages", async () => {
    const id = await client();
    const sub = await subscription(id);
    expect((await sendCoachingMessage(db, id, "  Is Day C on a Saturday fine?  ")).ok).toBe(true);
    await rpc(db, "akb_coaching_coach_message", { p_subscription: sub, p_body: "Yes." });
    let o = await active(id);
    expect(o.messages.map((m) => [m.from_client, m.body])).toEqual([[true, "Is Day C on a Saturday fine?"], [false, "Yes."]]);
    expect(o.unread).toBe(1);
    expect(await rpc(db, "akb_coaching_unread_for_coach", {})).toMatchObject({ ok: true });
    await markCoachingRead(db, id);
    o = await active(id);
    expect(o.unread).toBe(0);
  });

  it("refuses an empty message, and more than 30 an hour", async () => {
    const id = await client();
    await subscription(id);
    expect(await sendCoachingMessage(db, id, "   ")).toEqual({ ok: false, error: { kind: "rule", code: "P0001", rule: "invalid_message" } });
    for (let i = 0; i < 30; i++) await sendCoachingMessage(db, id, `m${i}`);
    expect(await sendCoachingMessage(db, id, "one more")).toEqual({ ok: false, error: { kind: "rule", code: "P0001", rule: "too_many" } });
  });

  it("never mixes up two clients", async () => {
    const a = await client();
    const b = await client();
    await subscription(a);
    await subscription(b);
    await sendCoachingMessage(db, a, "private to a");
    expect((await active(b)).messages).toHaveLength(0);
  });
});

describe("access", () => {
  it("is server only: anon and authenticated can't call the functions or read the tables", async () => {
    for (const fn of ["akb_coaching_overview(uuid)", "akb_coaching_log_session(uuid,integer,text,text,jsonb)", "akb_coaching_save_programme(uuid,text,text,integer,integer,date,jsonb)", "akb_coaching_coach_message(uuid,text)"]) {
      for (const role of ["anon", "authenticated"]) {
        expect((await sql("select has_function_privilege($1, $2, 'execute') as ok", [role, `public.${fn}`]))[0].ok).toBe(false);
      }
    }
    for (const table of ["akb_coaching_programmes", "akb_coaching_items", "akb_coaching_logs", "akb_coaching_set_logs", "akb_coaching_check_ins", "akb_coaching_messages"]) {
      for (const role of ["anon", "authenticated"]) {
        expect((await sql("select has_table_privilege($1, $2, 'select') as ok", [role, `public.${table}`]))[0].ok).toBe(false);
      }
      expect((await sql("select relrowsecurity as on from pg_class where oid = $1::regclass", [`public.${table}`]))[0].on).toBe(true);
    }
  });

  it("refuses a demo link that isn't https", async () => {
    const id = await client();
    const sub = await subscription(id);
    const r = await rpc(db, "akb_coaching_save_programme", {
      p_subscription: sub, p_name: "X", p_goal: "", p_weeks: 1, p_days_per_week: 1, p_starts_on: "2026-11-02",
      p_items: [{ week: 1, day: "Day A", position: 1, name: "Swing", sets: 3, reps: "10", load: "", note: "", video_url: "http://example.com/v" }],
    });
    expect(r.ok).toBe(false);
  });
});
