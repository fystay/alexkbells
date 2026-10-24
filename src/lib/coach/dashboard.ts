import { listAttendance, listClassSessions, listPackages, listPtSessions } from "./bookings";
import { CLASS_NAME, findSlot } from "./classes";
import { listClients, listFollowUps } from "./clients";
import { collect, select, type Db, type DbError } from "./db";
import { listCharges, listPayments, listRefunds } from "./ledger";
import { currentPeriods, listMemberships } from "./memberships";
import { formatPence } from "./money";
import { listSubscriptions } from "./online";
import { listRequests } from "./requests";
import { expectedMonthly, monthlyNet, outstanding, receivedIn, type Totals } from "./revenue";
import { addDays, addMonths, endOfMonth, formatDate, formatDateTime, londonToUtc, monthsBetween, startOfMonth, startOfWeek, type DateKey } from "./time";
import type { BookingRequest, Charge, Client, Payment, ServiceKey } from "./types";

export interface AttentionItem {
  kind: "request" | "payment-due" | "payment-failed" | "upcoming" | "check-in" | "renewal" | "package" | "membership" | "follow-up";
  title: string;
  detail: string;
  href: string;
  /** For ordering: the date it relates to. */
  date: string;
  urgent: boolean;
}

export interface DashboardData {
  today: DateKey;
  receivedWeek: Totals;
  receivedMonth: Totals;
  outstanding: { due: number; later: number };
  activeClients: number;
  delivered: { classes: number; pt: number };
  upcoming: { classPlaces: number; pt: number };
  requests: { new: number; awaiting: number };
  online: { active: number; expectedMonthly: number };
  months: { month: string; byService: Record<ServiceKey, number>; net: number }[];
  attention: AttentionItem[];
}

const ATTENTION_ORDER: AttentionItem["kind"][] = ["request", "payment-failed", "payment-due", "follow-up", "check-in", "upcoming", "renewal", "membership", "package"];

/** Everything the dashboard shows, loaded in parallel. Fails as a whole if any part can't be read. */
export async function loadDashboard(db: Db, today: DateKey, now: Date = new Date()): Promise<{ ok: true; data: DashboardData } | { ok: false; error: DbError }> {
  const monthStart = startOfMonth(today);
  const weekStart = startOfWeek(today);
  const chartFrom = addMonths(monthStart, -5);
  const ledgerFrom = weekStart < chartFrom ? weekStart : chartFrom;
  const soon = addDays(today, 7);
  const nowIso = now.toISOString();

  const loaded = collect(
    await Promise.all([
      listRequests(db, { filter: "open", limit: 200 }),
      select<{ id: string }>(db, "akb_clients", [["select", "id"], ["status", "eq.active"]]),
      listPayments(db, { from: ledgerFrom, to: endOfMonth(today) }),
      listRefunds(db, { from: ledgerFrom, to: endOfMonth(today) }),
      listCharges(db, { openOnly: true }),
      listClassSessions(db, monthStart, soon > endOfMonth(today) ? soon : endOfMonth(today)),
      listPtSessions(db, { from: londonToUtc(monthStart, "00:00"), to: londonToUtc(addDays(soon, 1), "00:00") }),
      listSubscriptions(db),
      listPackages(db, { activeOnly: true }),
      listFollowUps(db, { open: true, dueBy: today }),
      listPayments(db, { status: "failed", from: addDays(today, -60) }),
      listMemberships(db, { status: "active" }),
      currentPeriods(db, today),
    ] as const),
  );
  if (!loaded.ok) return loaded;
  const [requests, active, payments, refunds, charges, classes, pt, subscriptions, packages, followUps, failed, members, periods] = loaded.data;

  // Refunds in the window may belong to older payments: load those too, so each refund knows its service.
  const known = new Set(payments.map((p) => p.id));
  const missing = [...new Set(refunds.map((r) => r.payment_id).filter((id) => !known.has(id)))];
  let ledgerPayments: Payment[] = payments;
  if (missing.length) {
    const older = await listPayments(db, { ids: missing });
    if (!older.ok) return older;
    ledgerPayments = [...payments, ...older.data];
  }

  // Attendance for the upcoming classes.
  const upcomingClasses = classes.filter((c) => c.starts_at >= nowIso && c.class_date <= soon);
  const attendance = upcomingClasses.length ? await listAttendance(db, { sessionIds: upcomingClasses.map((c) => c.id) }) : { ok: true as const, data: [] };
  if (!attendance.ok) return attendance;

  // Names for everyone mentioned.
  const clientIds = new Set<string>();
  for (const c of charges) clientIds.add(c.client_id);
  for (const s of subscriptions) clientIds.add(s.client_id);
  for (const k of packages) clientIds.add(k.client_id);
  for (const f of followUps) clientIds.add(f.client_id);
  for (const p of pt) clientIds.add(p.client_id);
  for (const p of failed) clientIds.add(p.client_id);
  for (const m of members) clientIds.add(m.client_id);
  const clients = clientIds.size ? await listClients(db, { ids: [...clientIds] }) : { ok: true as const, data: [] as Client[] };
  if (!clients.ok) return clients;
  const name = (id: string) => clients.data.find((c) => c.id === id)?.full_name ?? "Client";

  const attention: AttentionItem[] = [];
  for (const r of requests) attention.push(requestItem(r));
  for (const c of charges.filter((c) => c.due_on <= today)) attention.push(chargeItem(c, name(c.client_id), today));
  for (const p of failed) {
    attention.push({
      kind: "payment-failed",
      title: `Payment failed: ${name(p.client_id)}`,
      detail: `${formatPence(p.amount_pence)} on ${formatDate(p.paid_on)}`,
      href: `/coach/finances/payments/${p.id}`,
      date: p.paid_on,
      urgent: true,
    });
  }
  for (const f of followUps) {
    attention.push({ kind: "follow-up", title: `Follow up: ${name(f.client_id)}`, detail: f.note, href: `/coach/clients/${f.client_id}?tab=follow-ups`, date: f.due_on, urgent: f.due_on < today });
  }
  const activeSubs = subscriptions.filter((s) => s.status === "active");
  for (const s of activeSubs) {
    if (s.next_check_in_on && s.next_check_in_on <= addDays(today, 1)) {
      attention.push({ kind: "check-in", title: `Check-in due: ${name(s.client_id)}`, detail: `${s.plan}, due ${formatDate(s.next_check_in_on)}`, href: `/coach/online/${s.id}`, date: s.next_check_in_on, urgent: s.next_check_in_on < today });
    }
    if (s.renews_on && s.renews_on <= soon && (!s.end_on || s.renews_on <= s.end_on)) {
      attention.push({ kind: "renewal", title: `Renewal due: ${name(s.client_id)}`, detail: `${s.plan}, ${formatPence(s.price_pence)} from ${formatDate(s.renews_on)}`, href: `/coach/online/${s.id}`, date: s.renews_on, urgent: s.renews_on < today });
    }
  }
  for (const k of packages.filter((k) => k.sessions_remaining <= 1)) {
    attention.push({
      kind: "package",
      title: `${k.sessions_remaining === 0 ? "Package used up" : "One session left"}: ${name(k.client_id)}`,
      detail: k.name,
      href: `/coach/clients/${k.client_id}?tab=packages`,
      date: k.purchased_on,
      urgent: false,
    });
  }
  // Members who have used every credit in this period: worth a word (an upgrade, or pay as you go until renewal).
  for (const m of members) {
    const p = periods.find((x) => x.membership_id === m.id);
    if (p && p.credits_left === 0) {
      attention.push({ kind: "membership", title: `No credits left: ${name(m.client_id)}`, detail: `${m.plan_name}, new credits ${formatDate(m.next_period_on)}`, href: `/coach/memberships/${m.id}`, date: p.period_end, urgent: false });
    }
  }
  const upcomingPt = pt.filter((p) => p.status === "scheduled" && p.starts_at >= nowIso && p.starts_at < londonToUtc(addDays(today, 2), "00:00"));
  for (const p of upcomingPt) {
    attention.push({ kind: "upcoming", title: `One-to-one: ${name(p.client_id)}`, detail: formatDateTime(p.starts_at), href: `/coach/sessions/${p.id}`, date: p.starts_at.slice(0, 10), urgent: false });
  }
  for (const c of upcomingClasses.filter((c) => c.class_date <= addDays(today, 1))) {
    const places = attendance.data.filter((a) => a.class_session_id === c.id && a.status === "booked").length;
    if (!places) continue;
    const slot = findSlot(c.slot);
    attention.push({
      kind: "upcoming",
      title: `${CLASS_NAME}: ${places} booked`,
      detail: formatDateTime(c.starts_at),
      href: `/coach/classes/${c.class_date}/${slot?.id ?? c.slot}`,
      date: c.class_date,
      urgent: false,
    });
  }
  attention.sort((a, b) => ATTENTION_ORDER.indexOf(a.kind) - ATTENTION_ORDER.indexOf(b.kind) || a.date.localeCompare(b.date));

  const monthEnd = endOfMonth(today);
  const thisMonthClasses = classes.filter((c) => c.class_date >= monthStart && c.class_date <= monthEnd);
  return {
    ok: true,
    data: {
      today,
      receivedWeek: receivedIn(ledgerPayments, refunds, { from: weekStart, to: addDays(weekStart, 6) }).total,
      receivedMonth: receivedIn(ledgerPayments, refunds, { from: monthStart, to: monthEnd }).total,
      outstanding: outstanding(charges, today),
      activeClients: active.length,
      delivered: {
        classes: thisMonthClasses.filter((c) => c.attended > 0).length,
        pt: pt.filter((p) => p.status === "attended" && p.starts_at < londonToUtc(addDays(monthEnd, 1), "00:00")).length,
      },
      upcoming: {
        classPlaces: attendance.data.filter((a) => a.status === "booked").length,
        pt: pt.filter((p) => p.status === "scheduled" && p.starts_at >= nowIso && p.starts_at < londonToUtc(addDays(soon, 1), "00:00")).length,
      },
      requests: {
        new: requests.filter((r) => r.status === "new").length,
        awaiting: requests.filter((r) => r.status === "awaiting").length,
      },
      online: { active: activeSubs.length, expectedMonthly: expectedMonthly(subscriptions, today) },
      months: monthlyNet(ledgerPayments, refunds, monthsBetween(chartFrom, today)),
      attention,
    },
  };
}

function requestItem(r: BookingRequest): AttentionItem {
  return {
    kind: "request",
    title: `${r.status === "new" ? "New request" : "Awaiting response"}: ${r.name}`,
    detail: [r.service, r.summary].filter(Boolean).join(" · "),
    href: `/coach/requests/${r.id}`,
    date: r.created_at.slice(0, 10),
    urgent: r.status === "new",
  };
}

function chargeItem(c: Charge, client: string, today: DateKey): AttentionItem {
  const overdue = c.due_on < today;
  return {
    kind: "payment-due",
    title: `${overdue ? "Overdue" : "Payment due"}: ${client}`,
    detail: `${formatPence(c.outstanding_pence)} for ${c.description}${c.paid_pence > 0 ? " (part paid)" : ""}`,
    href: `/coach/clients/${c.client_id}?tab=payments`,
    date: c.due_on,
    urgent: overdue,
  };
}
