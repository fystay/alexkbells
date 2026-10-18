import type { ClassSession, TimeOfDay, Weekday } from "@/content/types";
import { addDays, fromDateKey, toDateKey, weekdayIndex, type DateKey } from "./dates";
import type { AvailabilityWindow, DayAvailability } from "./types";

/**
 * Real group class dates: every session in the confirmed weekly timetable
 * over the next four weeks. No capacity is known, so every date can be
 * requested and Alex confirms each place himself.
 */

export const CLASS_WINDOW_DAYS = 28;

const WEEKDAYS: Weekday[] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/** Only the fields the browser needs. */
export type ClassSlot = Pick<ClassSession, "day" | "start">;

export function classSlotId(date: DateKey, time: TimeOfDay): string {
  return `class-${date}-${time}`;
}

export function classAvailability(sessions: readonly ClassSlot[], today: DateKey): AvailabilityWindow {
  const from = addDays(today, 1);
  const to = addDays(today, CLASS_WINDOW_DAYS);
  const days: DayAvailability[] = [];
  for (let i = 1; i <= CLASS_WINDOW_DAYS; i++) {
    const date = addDays(today, i);
    const day = WEEKDAYS[weekdayIndex(date)];
    const times = sessions
      .filter((s) => s.day === day)
      .map((s) => s.start)
      .sort();
    if (times.length === 0) continue;
    days.push({ date, slots: times.map((time) => ({ id: classSlotId(date, time), time, available: true })) });
  }
  return { source: "live", from, to, days };
}

/** Server check: is `date` a real class day for `session` within the booking window (with a day's slack for time zones)? */
export function isClassDate(date: string, session: ClassSlot, today: DateKey): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || toDateKey(fromDateKey(date)) !== date) return false;
  if (date < addDays(today, 0) || date > addDays(today, CLASS_WINDOW_DAYS + 1)) return false;
  return WEEKDAYS[weekdayIndex(date)] === session.day;
}
