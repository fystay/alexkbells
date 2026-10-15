import { timetable } from "@/content/classes";
import type { Env } from "./env";
import { isPublishable } from "./publish";
import { formatTime, sortSessions } from "./schedule";

/** Confirmed weekly class times as choices, e.g. "Monday 6:30 pm". Empty until the timetable is publishable. */
export function publishedSessionLabels(env: Env = process.env): string[] {
  if (!isPublishable(timetable.status, env)) return [];
  return sortSessions(timetable.sessions).map((s) => `${s.day} ${formatTime(s.start)}`);
}
