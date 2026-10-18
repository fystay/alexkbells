import { timetable } from "@/content/classes";
import type { ClassSlot } from "./availability/timetable";
import type { Env } from "./env";
import { isPublishable } from "./publish";
import { formatTime, sortSessions } from "./schedule";

export interface PublishedClass extends ClassSlot {
  /** e.g. "Monday 6:30 pm": the value a booking request carries. */
  label: string;
  durationMinutes?: number;
}

/** Confirmed weekly classes. Empty until the timetable is publishable. */
export function publishedClasses(env: Env = process.env): PublishedClass[] {
  if (!isPublishable(timetable.status, env)) return [];
  return sortSessions(timetable.sessions).map((s) => ({
    label: `${s.day} ${formatTime(s.start)}`,
    day: s.day,
    start: s.start,
    durationMinutes: s.durationMinutes,
  }));
}

/** Confirmed weekly class times as choices, e.g. "Monday 6:30 pm". */
export function publishedSessionLabels(env: Env = process.env): string[] {
  return publishedClasses(env).map((c) => c.label);
}
