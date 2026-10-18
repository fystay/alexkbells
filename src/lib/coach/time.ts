/**
 * Dates and times for the coach portal, always in UK time (Europe/London),
 * whatever time zone the server runs in. Dates are "YYYY-MM-DD" keys; instants
 * are ISO strings in UTC as stored by Postgres (timestamptz).
 */

export const TIME_ZONE = "Europe/London";

export type DateKey = string;

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function isDateKey(value: string): boolean {
  if (!DATE.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

export function isTime(value: string): boolean {
  return TIME.test(value);
}

const partsFormat = new Intl.DateTimeFormat("en-GB", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

function londonParts(instant: Date): { date: DateKey; time: string } {
  const parts = Object.fromEntries(partsFormat.formatToParts(instant).map((p) => [p.type, p.value]));
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}

/** Today's date in the UK. */
export function londonToday(now: Date = new Date()): DateKey {
  return londonParts(now).date;
}

/** The UK date and "HH:MM" time of an instant. */
export function toLondon(iso: string | Date): { date: DateKey; time: string } {
  return londonParts(typeof iso === "string" ? new Date(iso) : iso);
}

/**
 * The instant (ISO, UTC) of a UK wall-clock date and time. In the spring
 * gap (01:00–02:00 on the last Sunday in March) the time is moved forward
 * an hour; in the autumn overlap the first (BST) occurrence is used.
 */
export function londonToUtc(date: DateKey, time: string): string {
  if (!isDateKey(date) || !isTime(time)) throw new Error("Invalid date or time");
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const wall = Date.UTC(y, m - 1, d, hh, mm);
  // Try the offsets either side and keep the one that maps back to the same wall time.
  const candidates = [wall - 60 * 60 * 1000, wall].map((t) => new Date(t));
  for (const candidate of candidates) {
    const back = londonParts(candidate);
    if (back.date === date && back.time === time) return candidate.toISOString();
  }
  // Spring-forward gap: the wall time doesn't exist; use the instant an hour later on the clock.
  return new Date(wall).toISOString();
}

export function addDays(key: DateKey, days: number): DateKey {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** Same day of the month, clamped (31 Jan + 1 month = 28/29 Feb), as Postgres does. */
export function addMonths(key: DateKey, months: number): DateKey {
  const [y, m, d] = key.split("-").map(Number);
  const target = new Date(Date.UTC(y, m - 1 + months, 1));
  const last = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(d, last));
  return target.toISOString().slice(0, 10);
}

/** 0 = Monday … 6 = Sunday. */
export function weekday(key: DateKey): number {
  const [y, m, d] = key.split("-").map(Number);
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
}

export function startOfWeek(key: DateKey): DateKey {
  return addDays(key, -weekday(key));
}

export function startOfMonth(key: DateKey): DateKey {
  return `${key.slice(0, 7)}-01`;
}

export function endOfMonth(key: DateKey): DateKey {
  return addDays(addMonths(startOfMonth(key), 1), -1);
}

export function daysBetween(from: DateKey, to: DateKey): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

/** "YYYY-MM" for each month from `from` to `to` inclusive. */
export function monthsBetween(from: DateKey, to: DateKey): string[] {
  const months: string[] = [];
  let cursor = startOfMonth(from);
  while (cursor <= to && months.length < 240) {
    months.push(cursor.slice(0, 7));
    cursor = addMonths(cursor, 1);
  }
  return months;
}

const utcDate = (key: DateKey) => new Date(`${key}T12:00:00Z`);

function dateParts(key: DateKey, style: "short" | "long"): Record<string, string> {
  const format = new Intl.DateTimeFormat("en-GB", { weekday: style, day: "numeric", month: style, year: "numeric", timeZone: "UTC" });
  return Object.fromEntries(format.formatToParts(utcDate(key)).map((p) => [p.type, p.value]));
}

/** "Sat 24 Oct 2026" (built from parts: some engines add a comma after the weekday). */
export function formatDate(key: DateKey): string {
  const p = dateParts(key, "short");
  return `${p.weekday} ${p.day} ${p.month} ${p.year}`;
}

/** "Saturday 24 October 2026" */
export function formatLongDate(key: DateKey): string {
  const p = dateParts(key, "long");
  return `${p.weekday} ${p.day} ${p.month} ${p.year}`;
}

/** "24 Oct" */
export function formatDayMonth(key: DateKey): string {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }).format(utcDate(key));
}

/** "October 2026" for "2026-10" or a date in it. */
export function formatMonth(key: string): string {
  return new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(utcDate(`${key.slice(0, 7)}-01`));
}

/** "Oct" for "2026-10". */
export function formatShortMonth(key: string): string {
  return new Intl.DateTimeFormat("en-GB", { month: "short", timeZone: "UTC" }).format(utcDate(`${key.slice(0, 7)}-01`));
}

/** "6:30 pm" for "18:30". */
export function formatClock(time: string): string {
  const [h, m] = time.split(":").map(Number);
  return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "pm" : "am"}`;
}

/** "Sat 24 Oct 2026, 10:15 am" in UK time. */
export function formatDateTime(iso: string): string {
  const { date, time } = toLondon(iso);
  return `${formatDate(date)}, ${formatClock(time)}`;
}

/** "17 Oct 2026, 2:05 pm" for timestamps such as when a request arrived. */
export function formatStamp(iso: string): string {
  const { date, time } = toLondon(iso);
  return `${formatDayMonth(date)} ${date.slice(0, 4)}, ${formatClock(time)}`;
}

export function minutesBetween(startIso: string, endIso: string): number {
  return Math.round((Date.parse(endIso) - Date.parse(startIso)) / 60_000);
}

export function addMinutesIso(iso: string, minutes: number): string {
  return new Date(Date.parse(iso) + minutes * 60_000).toISOString();
}
