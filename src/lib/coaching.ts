import { getService } from "@/content/services";
import { rpc, type Db, type DbResult } from "./coach/db";
import { publishable } from "./publish";

/**
 * Raeng Coaching, the member side of online coaching (owner's members design,
 * 2026-10-28; migration 20261101000000_akb_coaching_area.sql). The database
 * finds the signed-in client's own active coaching subscription itself, so a
 * member can only read or write their own. Server only (secret key).
 */

export const COACHING_PATH = "/account/coaching";
export const COACHING_PROGRAMME_PATH = "/account/coaching/programme";
export const COACHING_CHECK_IN_PATH = "/account/coaching/check-in";
export const COACHING_MESSAGES_PATH = "/account/coaching/messages";
export const COACHING_UNLOCK_PATH = "/account/coaching/unlock";

export interface CoachingItem {
  id: string;
  week: number;
  day: string;
  position: number;
  name: string;
  sets: number;
  reps: string;
  load: string;
  note: string;
  video_url: string | null;
}

export interface CoachingSetLog {
  item_id: string | null;
  item_name: string;
  position: number;
  set_no: number;
  load: string;
  reps: string;
  done: boolean;
}

export interface CoachingLog {
  id: string;
  week: number;
  day: string;
  note: string;
  logged_at: string;
  sets: CoachingSetLog[];
}

export interface CoachingCheckIn {
  id: string;
  created_at: string;
  week_of: string;
  programme_week: number | null;
  energy: number;
  sleep: number;
  training: number;
  wins: string;
  struggles: string;
  video_url: string | null;
  coach_reply: string | null;
  replied_at: string | null;
}

export interface CoachingMessage {
  id: number;
  created_at: string;
  from_client: boolean;
  body: string;
  read_at: string | null;
}

export interface CoachingProgramme {
  id: string;
  name: string;
  goal: string;
  weeks: number;
  days_per_week: number;
  starts_on: string;
  week: number;
  items: CoachingItem[];
}

export type CoachingOverview =
  | { active: false }
  | {
      active: true;
      subscription: { id: string; plan: string; price_pence: number; start_on: string; status: string };
      today: string;
      week_of: string;
      programme: CoachingProgramme | null;
      logs: CoachingLog[];
      check_ins: CoachingCheckIn[];
      messages: CoachingMessage[];
      unread: number;
      check_in_sent: boolean;
    };

/** The small version, for the card on Home, the menu and the Plan tab. */
export type CoachingStatus =
  | { active: false }
  | {
      active: true;
      plan: string;
      price_pence: number;
      programme: { name: string; weeks: number; days_per_week: number; week: number } | null;
      unread: number;
      check_in_sent: boolean;
    };

export const coachingStatus = (db: Db, clientId: string) => rpc<CoachingStatus>(db, "akb_coaching_status", { p_client: clientId });
export const coachingOverview = (db: Db, clientId: string) => rpc<CoachingOverview>(db, "akb_coaching_overview", { p_client: clientId });

export interface LoggedSet {
  item_id: string;
  set_no: number;
  load: string;
  reps: string;
  done: boolean;
}

export const logSession = (db: Db, clientId: string, week: number, day: string, note: string, sets: LoggedSet[]): Promise<DbResult<string>> =>
  rpc<string>(db, "akb_coaching_log_session", { p_client: clientId, p_week: week, p_day: day, p_note: note, p_sets: sets });

export interface CheckInInput {
  energy: number;
  sleep: number;
  training: number;
  wins: string;
  struggles: string;
  video: string;
}

export const submitCheckIn = (db: Db, clientId: string, c: CheckInInput): Promise<DbResult<string>> =>
  rpc<string>(db, "akb_coaching_submit_check_in", {
    p_client: clientId,
    p_energy: c.energy,
    p_sleep: c.sleep,
    p_training: c.training,
    p_wins: c.wins,
    p_struggles: c.struggles,
    p_video: c.video,
  });

export const sendCoachingMessage = (db: Db, clientId: string, body: string) => rpc<number>(db, "akb_coaching_send_message", { p_client: clientId, p_body: body });
export const markCoachingRead = (db: Db, clientId: string) => rpc<null>(db, "akb_coaching_mark_read", { p_client: clientId });

// ---------------------------------------------------------------------------
// Reading the programme (pure, unit-tested)
// ---------------------------------------------------------------------------

/** "5 each" → ["5", "each"], "40 m each" → ["40", "m each"], "10" → ["10", "reps"], "24 kg" → ["24", "kg"]. */
export function qty(value: string): [string, string] {
  const m = /^([\d.]+)\s*(.*)$/.exec(value.trim());
  return m ? [m[1], m[2] || "reps"] : ["", value.trim()];
}

export type Programmed = Extract<CoachingOverview, { active: true }>;

/** The small status a full overview implies (for the shell's menu and ring). */
export function statusOf(o: Programmed): Extract<CoachingStatus, { active: true }> {
  const p = o.programme;
  return {
    active: true,
    plan: o.subscription.plan,
    price_pence: o.subscription.price_pence,
    programme: p && { name: p.name, weeks: p.weeks, days_per_week: p.days_per_week, week: p.week },
    unread: o.unread,
    check_in_sent: o.check_in_sent,
  };
}

/** The days of a week in programme order ("Day A", "Day B"…). */
export function daysOf(programme: CoachingProgramme, week: number): string[] {
  return [...new Set(programme.items.filter((i) => i.week === week).map((i) => i.day))];
}

export function itemsOf(programme: CoachingProgramme, week: number, day: string): CoachingItem[] {
  return programme.items.filter((i) => i.week === week && i.day === day).sort((a, b) => a.position - b.position);
}

export function logOf(o: Programmed, week: number, day: string): CoachingLog | undefined {
  return o.logs.find((l) => l.week === week && l.day === day);
}

/** Sessions logged in a programme week. */
export function sessionsDone(o: Programmed, week: number): number {
  return o.logs.filter((l) => l.week === week).length;
}

/** Today's day: the one asked for, else the first this week not yet logged, else the first. */
export function chosenDay(o: Programmed, programme: CoachingProgramme, asked: string | null): string {
  const days = daysOf(programme, programme.week);
  if (asked && days.includes(asked)) return asked;
  return days.find((d) => !logOf(o, programme.week, d)) ?? days[0] ?? "";
}

/** What was logged for this exercise on the same day last week, e.g. "20 kg × 10", or null. */
export function lastWeekFor(o: Programmed, week: number, day: string, name: string): string | null {
  const log = o.logs.find((l) => l.week === week - 1 && l.day === day);
  const done = log?.sets.filter((s) => s.item_name === name && s.done) ?? [];
  if (!log || done.length === 0) return null;
  const top = done.reduce((best, s) => (parseFloat(s.load) > parseFloat(best.load) ? s : best), done[0]);
  const item = o.programme?.items.find((i) => i.week === week - 1 && i.day === day && i.name === name);
  const [, loadUnit] = qty(item?.load ?? "");
  const [, repUnit] = qty(item?.reps ?? "");
  return `${top.load}${top.load ? ` ${loadUnit === "reps" ? "" : loadUnit}`.trimEnd() : ""} × ${top.reps}${repUnit && repUnit !== "reps" ? ` ${repUnit}` : ""}`.replace(/\s+/g, " ").trim();
}

/** One line per exercise of a logged session: "Two-hand swing 5 × 10 · 24 kg". */
export function summariseLog(log: CoachingLog, programme: CoachingProgramme | null): string[] {
  const names = [...new Set(log.sets.map((s) => s.item_name))];
  const lines = names.flatMap((name) => {
    const done = log.sets.filter((s) => s.item_name === name && s.done);
    if (done.length === 0) return [];
    const item = programme?.items.find((i) => i.week === log.week && i.day === log.day && i.name === name);
    const [, repUnit] = qty(item?.reps ?? "");
    const [, loadUnit] = qty(item?.load ?? "");
    const top = done.reduce((m, s) => Math.max(m, parseFloat(s.load) || 0), 0);
    return [`${name} ${done.length} × ${done[0].reps}${repUnit && repUnit !== "reps" ? ` ${repUnit}` : ""}${top ? ` · ${top}${loadUnit && loadUnit !== "reps" ? ` ${loadUnit}` : ""}` : ""}`];
  });
  return lines.length ? lines : ["No sets ticked"];
}

export function totalSets(items: readonly CoachingItem[]): number {
  return items.reduce((n, i) => n + i.sets, 0);
}

/** "Mon 12 Oct" for the Monday-start of programme week w. */
export function weekStart(startsOn: string, week: number): string {
  const d = new Date(`${startsOn}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 7 * (week - 1));
  return d.toISOString().slice(0, 10);
}

/** The one published monthly price of online coaching (content/services.ts), or null while it isn't. */
export function onlineCoachingPrice(): number | null {
  const prices = publishable(getService("online-coaching").prices);
  return prices.length === 1 ? prices[0].amountGbp : null;
}
