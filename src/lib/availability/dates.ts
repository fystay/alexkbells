/**
 * Calendar dates as "YYYY-MM-DD" keys in the visitor's local time zone, so a
 * date never shifts by a day through UTC conversion.
 */
export type DateKey = string;

const DAY_MS = 24 * 60 * 60 * 1000;

export function toDateKey(date: Date): DateKey {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Local midday avoids daylight-saving edge cases when adding days. */
export function fromDateKey(key: DateKey): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d, 12);
}

export function addDays(key: DateKey, days: number): DateKey {
  return toDateKey(new Date(fromDateKey(key).getTime() + days * DAY_MS));
}

/** 0 = Monday … 6 = Sunday. */
export function weekdayIndex(key: DateKey): number {
  return (fromDateKey(key).getDay() + 6) % 7;
}

/** "Tuesday 21 October" */
export function formatLongDate(key: DateKey): string {
  return new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long" }).format(fromDateKey(key));
}

/** "Tue 21 Oct" */
export function formatShortDate(key: DateKey): string {
  return new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short" }).format(fromDateKey(key));
}

/** "October 2026" */
export function formatMonth(key: DateKey): string {
  return new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric" }).format(fromDateKey(key));
}

export function monthKey(key: DateKey): string {
  return key.slice(0, 7);
}

/** Monday-first grid for the month containing `key`: leading nulls pad the first week. */
export function monthGrid(key: DateKey): (DateKey | null)[] {
  const first = fromDateKey(`${monthKey(key)}-01`);
  const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const lead = (first.getDay() + 6) % 7;
  const cells: (DateKey | null)[] = Array.from({ length: lead }, () => null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(`${monthKey(key)}-${String(d).padStart(2, "0")}`);
  return cells;
}
