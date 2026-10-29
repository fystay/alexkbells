import { addDays, weekdayIndex, type DateKey } from "./availability/dates";
import { CLASS_WINDOW_DAYS } from "./availability/timetable";

const WEEKDAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

/** A timetable class: its id, the weekday ("Monday") and the start ("18:30"). */
export interface StatusClass {
  id: string;
  day: string;
  start: string;
}

export interface ClassRedirect {
  /** The timetable id of the next class with a place. */
  id: string;
  date: DateKey;
  day: string;
  start: string;
}

export interface ClassStatus {
  /** The class's next date is fully booked. */
  full: boolean;
  /** Where to send people instead: the next class with a place (null if none in the window). */
  redirect: ClassRedirect | null;
}

/**
 * Which weekly classes are fully booked on their next date, and the next
 * class that still has a place. Same window and day rules as the booking
 * calendar (classAvailability): from tomorrow, four weeks ahead, classes the
 * coach cancelled left out. `full` and `cancelled` are "slot|date" keys
 * (lib/class-capacity.ts).
 */
export function classStatuses(
  classes: readonly StatusClass[],
  today: DateKey,
  full: ReadonlySet<string>,
  cancelled: ReadonlySet<string>,
): Map<string, ClassStatus> {
  const open: ClassRedirect[] = [];
  const firstDateFull = new Map<string, boolean>();
  for (let i = 1; i <= CLASS_WINDOW_DAYS; i++) {
    const date = addDays(today, i);
    const day = WEEKDAYS[weekdayIndex(date)];
    for (const c of classes) {
      if (c.day !== day || cancelled.has(`${c.id}|${date}`)) continue;
      const isFull = full.has(`${c.id}|${date}`);
      if (!firstDateFull.has(c.id)) firstDateFull.set(c.id, isFull);
      if (!isFull) open.push({ id: c.id, date, day: c.day, start: c.start });
    }
  }
  // Dates run forward, so the first open entry per day-order is the earliest; ties on a day go by start time.
  open.sort(
    (a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start),
  );
  const redirect = open[0] ?? null;
  const result = new Map<string, ClassStatus>();
  for (const c of classes) {
    const isFull = firstDateFull.get(c.id) ?? false;
    result.set(c.id, { full: isFull, redirect: isFull ? redirect : null });
  }
  return result;
}
