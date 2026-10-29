import { classOccurrences, CLASS_NAME, classDurationMinutes, type ClassOccurrence } from "./classes";
import { getDefaultCapacity, listAttendance, listClassSessions, listPtSessions } from "./bookings";
import { listClients } from "./clients";
import { collect, rpc, type Db, type DbError, type DbResult } from "./db";
import { listCharges } from "./ledger";
import { currentPeriods, periodsOn } from "./memberships";
import { listSubscriptions } from "./online";
import { listRequests } from "./requests";
import { addDays, formatClock, londonToUtc, toLondon, type DateKey } from "./time";
import type { Attendance, BookingRequest, Client, ClassSessionRow, PtSession } from "./types";
import type { MembershipPeriod } from "./memberships";

/**
 * What the coach portal's four tabs show (owner's coach design, 2026-10-28:
 * Today, Schedule, Members, Inbox), worked out from the data the portal
 * already holds. Loaders read; the pure helpers at the bottom are unit-tested.
 */

// ---------------------------------------------------------------------------
// Inbox
// ---------------------------------------------------------------------------

export type InboxGroup = "pay" | "req" | "onl" | "coach";

export interface InboxItem {
  id: string;
  group: InboxGroup;
  /** "Payment to confirm", "1:1 request", "Online enquiry", "Check-in to review", "Client message"… */
  label: string;
  who: string;
  /** ISO time it relates to, newest first. */
  at: string;
  detail: string;
  href: string;
  action: string;
  urgent: boolean;
}

export const INBOX_FILTERS: { value: "all" | InboxGroup; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pay", label: "Payments" },
  { value: "req", label: "Requests" },
  { value: "onl", label: "Enquiries" },
  { value: "coach", label: "Coaching" },
];

interface CoachingInboxRow {
  kind: "check_in" | "message";
  subscription_id: string;
  name: string;
  at: string;
  detail: string;
}

function requestItem(r: BookingRequest): InboxItem {
  const online = r.kind === "online";
  return {
    id: `req-${r.id}`,
    group: online ? "onl" : "req",
    label: online ? "Online enquiry" : /one-to-one|1:1/i.test(r.service) ? "1:1 request" : `${r.service || "Booking"} request`,
    who: r.name,
    at: r.created_at,
    detail: [r.summary, r.message].filter(Boolean).join(" · ").slice(0, 200),
    href: `/coach/requests/${r.id}`,
    action: r.status === "new" ? "Reply" : "Open",
    urgent: r.status === "new",
  };
}

/**
 * Everything waiting on the coach in one list: open booking requests and
 * online enquiries, charges due (to mark paid), and coaching check-ins and
 * client messages. Fails as a whole if any part can't be read.
 */
export async function loadInbox(db: Db, today: DateKey): Promise<DbResult<InboxItem[]>> {
  const [loaded, coachingResult] = await Promise.all([
    Promise.all([listRequests(db, { filter: "open", limit: 200 }), listCharges(db, { openOnly: true })] as const).then((r) => collect(r)),
    rpc<CoachingInboxRow[]>(db, "akb_coaching_inbox", {}),
  ]);
  if (!loaded.ok) return loaded;
  const [requests, charges] = loaded.data;
  // Coaching items need the coaching migration. Until it is applied (or if it can't be read) they are left out, not the whole inbox.
  if (!coachingResult.ok) console.error(`Coaching inbox couldn't be read (${coachingResult.error.kind})`);
  const coaching = coachingResult.ok ? coachingResult.data : [];
  const due = charges.filter((c) => c.due_on <= today && !c.voided_at && c.outstanding_pence > 0);
  const clients = due.length ? await listClients(db, { ids: [...new Set(due.map((c) => c.client_id))] }) : { ok: true as const, data: [] as Client[] };
  if (!clients.ok) return clients;
  const name = (id: string) => clients.data.find((c) => c.id === id)?.full_name ?? "Client";
  const items: InboxItem[] = [
    ...requests.map(requestItem),
    ...due.map((c): InboxItem => ({
      id: `pay-${c.id}`,
      group: "pay",
      label: c.due_on < today ? "Overdue payment" : "Payment to confirm",
      who: name(c.client_id),
      at: `${c.due_on}T00:00:00Z`,
      detail: `${(c.outstanding_pence / 100).toLocaleString("en-GB", { style: "currency", currency: "GBP" })} for ${c.description}${c.paid_pence > 0 ? " (part paid)" : ""}`,
      href: `/coach/finances/payments/new?client=${c.client_id}&charge=${c.id}`,
      action: "Mark paid",
      urgent: c.due_on < today,
    })),
    ...coaching.map((c): InboxItem => ({
      id: `${c.kind}-${c.subscription_id}-${c.at}`,
      group: "coach",
      label: c.kind === "check_in" ? "Check-in to review" : "Client message",
      who: c.name,
      at: c.at,
      detail: c.detail,
      href: `/coach/online/${c.subscription_id}`,
      action: c.kind === "check_in" ? "Review" : "Reply",
      urgent: false,
    })),
  ];
  return { ok: true, data: items.sort((a, b) => Number(b.urgent) - Number(a.urgent) || b.at.localeCompare(a.at)) };
}

// ---------------------------------------------------------------------------
// Today and Schedule
// ---------------------------------------------------------------------------

export interface RosterEntry {
  attendanceId: string;
  clientId: string;
  name: string;
  email: string;
  status: Attendance["status"];
  /** "Dedicated · 7 of 12 credits" or "Pay as you go". */
  plan: string;
  low: boolean;
  payg: boolean;
}

export interface SessionView {
  occurrence: ClassOccurrence;
  row: ClassSessionRow | null;
  cancelled: boolean;
  booked: number;
  capacity: number | null;
}

/** A class's row from the portal's overview, as the cards show it. */
export function sessionView(occ: ClassOccurrence, rows: readonly ClassSessionRow[], usualSize: number): SessionView {
  const row = rows.find((r) => r.class_date === occ.date && r.slot === occ.slot.id) ?? null;
  return { occurrence: occ, row, cancelled: Boolean(row?.cancelled_at), booked: row?.booked ?? 0, capacity: row?.capacity ?? usualSize };
}

/** Is the class still on or to come? (Over an hour after it started, it's done.) */
export function stillToCome(occ: ClassOccurrence, now: Date): boolean {
  return new Date(occ.startsAt).getTime() + classDurationMinutes(occ.slot) * 60_000 > now.getTime();
}

export interface TodayData {
  next: SessionView | null;
  roster: RosterEntry[];
  comingUp: { startsAt: string; label: string; booked: number | null; capacity: number | null; pt: boolean; href: string }[];
  counts: { payments: number; replies: number; lowCredits: number };
}

export const LOW_CREDITS = 2;

export async function loadToday(db: Db, today: DateKey, now: Date = new Date()): Promise<{ ok: true; data: TodayData } | { ok: false; error: DbError }> {
  const horizon = addDays(today, 14);
  const occurrences = classOccurrences(today, horizon);
  const loaded = collect(
    await Promise.all([
      listClassSessions(db, today, horizon),
      listPtSessions(db, { from: londonToUtc(today, "00:00"), to: londonToUtc(addDays(horizon, 1), "00:00"), status: ["scheduled"] }),
      loadInbox(db, today),
      currentPeriods(db, today),
    ] as const),
  );
  if (!loaded.ok) return loaded;
  const [rows, pt, inbox, periods] = loaded.data;
  const usualSize = await getDefaultCapacity(db);
  const views = occurrences.filter((o) => stillToCome(o, now)).map((o) => sessionView(o, rows, usualSize)).filter((v) => !v.cancelled);
  const next = views[0] ?? null;

  let roster: RosterEntry[] = [];
  if (next?.row) {
    const attendance = await listAttendance(db, { sessionIds: [next.row.id] });
    if (!attendance.ok) return attendance;
    const places = attendance.data.filter((a) => a.status !== "cancelled");
    const ids = places.map((a) => a.client_id);
    const [clients, memberPeriods] = await Promise.all([ids.length ? listClients(db, { ids }) : { ok: true as const, data: [] as Client[] }, periodsOn(db, ids, next.occurrence.date)]);
    if (!clients.ok) return clients;
    if (!memberPeriods.ok) return memberPeriods;
    roster = places.map((a) => {
      const c = clients.data.find((x) => x.id === a.client_id);
      const p = memberPeriods.data.find((x) => x.client_id === a.client_id);
      return {
        attendanceId: a.id,
        clientId: a.client_id,
        name: c?.full_name ?? "Client",
        email: c?.email ?? "",
        status: a.status,
        plan: p ? `${p.plan_name} · ${p.credits_left} of ${p.credits} credit${p.credits === 1 ? "" : "s"}` : "Pay as you go",
        low: Boolean(p && p.credits_left <= LOW_CREDITS),
        payg: !p,
      };
    });
  }

  const comingUp: TodayData["comingUp"] = [
    ...views.slice(1, 4).map((v) => ({ startsAt: v.occurrence.startsAt, label: CLASS_NAME, booked: v.booked, capacity: v.capacity, pt: false, href: `/coach/classes/${v.occurrence.date}/${v.occurrence.slot.id}` })),
    ...pt.map((p: PtSession) => ({ startsAt: p.starts_at, label: "1:1", booked: null, capacity: null, pt: true, href: `/coach/sessions/${p.id}` })),
  ]
    .filter((c) => new Date(c.startsAt) > now)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
    .slice(0, 3);

  return {
    ok: true,
    data: {
      next,
      roster,
      comingUp,
      counts: {
        payments: inbox.filter((i) => i.group === "pay").length,
        replies: inbox.filter((i) => i.group !== "pay").length,
        lowCredits: periods.filter((p) => p.credits_left <= LOW_CREDITS).length,
      },
    },
  };
}

/** The week tabs: this week, next week, then the following two as date ranges. */
export function scheduleWeeks(startOfThisWeek: DateKey): { start: DateKey; end: DateKey; label: string }[] {
  return Array.from({ length: 4 }, (_, i) => {
    const start = addDays(startOfThisWeek, i * 7);
    return { start, end: addDays(start, 6), label: i === 0 ? "This week" : i === 1 ? "Next week" : "" };
  });
}

export interface ScheduleEntry {
  startsAt: string;
  date: DateKey;
  pt: boolean;
  title: string;
  booked: number;
  capacity: number | null;
  cancelled: boolean;
  past: boolean;
  href: string;
  /** For the group classes: to message the people booked. */
  occurrence?: ClassOccurrence;
}

export async function loadSchedule(db: Db, from: DateKey, to: DateKey, now: Date = new Date()): Promise<DbResult<ScheduleEntry[]>> {
  const loaded = collect(
    await Promise.all([listClassSessions(db, from, to), listPtSessions(db, { from: londonToUtc(from, "00:00"), to: londonToUtc(addDays(to, 1), "00:00") }), listClients(db, {})] as const),
  );
  if (!loaded.ok) return loaded;
  const [rows, pt, clients] = loaded.data;
  const usualSize = await getDefaultCapacity(db);
  const group = classOccurrences(from, to).map((o): ScheduleEntry => {
    const v = sessionView(o, rows, usualSize);
    return {
      startsAt: o.startsAt,
      date: o.date,
      pt: false,
      title: CLASS_NAME,
      booked: v.booked,
      capacity: v.capacity,
      cancelled: v.cancelled,
      past: new Date(o.startsAt).getTime() + classDurationMinutes(o.slot) * 60_000 < now.getTime(),
      href: `/coach/classes/${o.date}/${o.slot.id}`,
      occurrence: o,
    };
  });
  const solo = pt
    .filter((p) => p.status !== "cancelled")
    .map((p): ScheduleEntry => ({
      startsAt: p.starts_at,
      date: toLondon(p.starts_at).date,
      pt: true,
      title: `1:1 with ${clients.find((c) => c.id === p.client_id)?.full_name ?? "client"}`,
      booked: 1,
      capacity: null,
      cancelled: false,
      past: new Date(p.ends_at) < now,
      href: `/coach/sessions/${p.id}`,
    }));
  return { ok: true, data: [...group, ...solo].sort((a, b) => a.startsAt.localeCompare(b.startsAt)) };
}

// ---------------------------------------------------------------------------
// Members
// ---------------------------------------------------------------------------

export type MemberFilter = "all" | "low" | "renew" | "away" | "payg";

export const MEMBER_FILTERS: { value: MemberFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "low", label: "Low credits" },
  { value: "renew", label: "Credits expiring" },
  { value: "away", label: "Not seen 2 wks" },
  { value: "payg", label: "Pay as you go" },
];

export interface MemberRow {
  clientId: string;
  name: string;
  /** Plan name, or "Pay as you go". */
  plan: string;
  payg: boolean;
  creditsLeft: number;
  credits: number;
  /** Date of the last class attended in the last 8 weeks, or null. */
  lastClass: DateKey | null;
  /** The period's end, for credits that run out then. */
  periodEnd: DateKey | null;
}

/** Credits don't roll over, so what's left runs out when the period ends: worth a word in the last week. */
export function memberFlags(m: MemberRow, today: DateKey): { low: boolean; expiring: boolean; away: boolean } {
  const days = (a: DateKey, b: DateKey) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);
  return {
    low: !m.payg && m.creditsLeft <= LOW_CREDITS,
    expiring: !m.payg && m.creditsLeft > 0 && m.periodEnd !== null && days(today, m.periodEnd) <= 7,
    // Came in the last 8 weeks but not in the last 14 days.
    away: m.lastClass !== null && days(m.lastClass, today) > 14,
  };
}

export function matchesMemberFilter(m: MemberRow, f: MemberFilter, today: DateKey): boolean {
  const flags = memberFlags(m, today);
  return f === "all" ? true : f === "low" ? flags.low : f === "renew" ? flags.expiring : f === "away" ? flags.away : m.payg;
}

export async function loadMemberRows(db: Db, today: DateKey): Promise<DbResult<MemberRow[]>> {
  const from = addDays(today, -56);
  const loaded = collect(await Promise.all([listClients(db, { status: "active" }), currentPeriods(db, today), listClassSessions(db, from, today)] as const));
  if (!loaded.ok) return loaded;
  const [clients, periods, sessions] = loaded.data;
  const attendance = sessions.length ? await listAttendance(db, { sessionIds: sessions.map((s) => s.id) }) : { ok: true as const, data: [] as Attendance[] };
  if (!attendance.ok) return attendance;
  const dateOf = new Map(sessions.map((s) => [s.id, s.class_date]));
  const last = new Map<string, DateKey>();
  for (const a of attendance.data) {
    if (a.status !== "attended") continue;
    const d = dateOf.get(a.class_session_id);
    if (d && (!last.get(a.client_id) || d > last.get(a.client_id)!)) last.set(a.client_id, d);
  }
  const periodOf = (id: string): MembershipPeriod | undefined => periods.find((p) => p.client_id === id);
  return {
    ok: true,
    data: clients.map((c) => {
      const p = periodOf(c.id);
      return { clientId: c.id, name: c.full_name, plan: p ? p.plan_name : "Pay as you go", payg: !p, creditsLeft: p?.credits_left ?? 0, credits: p?.credits ?? 0, lastClass: last.get(c.id) ?? null, periodEnd: p?.period_end ?? null };
    }),
  };
}

export interface OnlineRow {
  subscriptionId: string;
  name: string;
  plan: string;
  needsCheckIn: boolean;
  unread: boolean;
}

/** Active online coaching clients, with whether a check-in or a message is waiting (from the inbox items). */
export async function loadOnlineRows(db: Db, inbox: readonly InboxItem[]): Promise<DbResult<OnlineRow[]>> {
  const loaded = collect(await Promise.all([listSubscriptions(db, { status: "active" })] as const));
  if (!loaded.ok) return loaded;
  const [subs] = loaded.data;
  const clients = subs.length ? await listClients(db, { ids: subs.map((s) => s.client_id) }) : { ok: true as const, data: [] as Client[] };
  if (!clients.ok) return clients;
  return {
    ok: true,
    data: subs.map((s) => {
      const name = clients.data.find((c) => c.id === s.client_id)?.full_name ?? "Client";
      const mine = inbox.filter((i) => i.group === "coach" && i.href === `/coach/online/${s.id}`);
      return { subscriptionId: s.id, name, plan: s.plan, needsCheckIn: mine.some((i) => i.label === "Check-in to review"), unread: mine.some((i) => i.label === "Client message") };
    }),
  };
}

// ---------------------------------------------------------------------------
// Messaging the class
// ---------------------------------------------------------------------------

/**
 * "Message class": the coach's own email app with everyone booked in Bcc (so
 * nobody sees each other's address) and a starting message. Nothing is sent
 * from here: that needs the email provider, which isn't switched on.
 */
export function messageClassLink(emails: readonly string[], when: string): string {
  const list = [...new Set(emails.map((e) => e.trim()).filter((e) => /^\S+@\S+\.\S+$/.test(e)))];
  if (list.length === 0) return "";
  const params = new URLSearchParams({ bcc: list.join(","), subject: `${CLASS_NAME}, ${when}`, body: `Hi all, a quick message about ${when}.\n\n` });
  // URLSearchParams writes spaces as "+", which mail apps show literally in a mailto: link.
  return `mailto:?${params.toString().replace(/\+/g, "%20")}`;
}

/** "Wed 28 Oct, 6:30 pm" for a UTC instant, in UK time (as the cards show it). */
export function whenLabel(startsAt: string): string {
  const { date, time } = toLondon(startsAt);
  const d = new Date(`${date}T00:00:00Z`);
  const weekday = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", weekday: "short" }).format(d);
  const dm = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", day: "numeric", month: "short" }).format(d);
  return `${weekday} ${dm}, ${formatClock(time)}`;
}

// ---------------------------------------------------------------------------
// The frame: what every portal page shows around its content
// ---------------------------------------------------------------------------

export interface ShellData {
  /** Everything waiting on the coach (the Inbox tab's badge). */
  inbox: number;
  next: SessionView | null;
  online: { clients: number; waiting: number };
}

/** Light enough to run on every portal page; any part that can't be read is left out. */
export async function loadShell(db: Db, today: DateKey, now: Date = new Date()): Promise<ShellData> {
  const horizon = addDays(today, 14);
  const [inbox, rows, subs, usualSize] = await Promise.all([loadInbox(db, today), listClassSessions(db, today, horizon), listSubscriptions(db, { status: "active" }), getDefaultCapacity(db)]);
  const views = rows.ok ? classOccurrences(today, horizon).filter((o) => stillToCome(o, now)).map((o) => sessionView(o, rows.data, usualSize)).filter((v) => !v.cancelled) : [];
  const items = inbox.ok ? inbox.data : [];
  return { inbox: items.length, next: views[0] ?? null, online: { clients: subs.ok ? subs.data.length : 0, waiting: items.filter((i) => i.group === "coach").length } };
}
