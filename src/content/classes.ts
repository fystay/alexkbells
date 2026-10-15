import type { Timetable } from "./types";

/**
 * Group class timetable as supplied by the client.
 *
 * Confirmed for publication by the project owner on 2026-10-15 (the times
 * from the original brief). Class length is not stored here; the FAQ gives
 * the industry-standard "around 45 minutes". See CONTENT.md.
 */
export const timetable: Timetable = {
  status: "confirmed",
  sessions: [
    { id: "mon-evening", day: "Monday", start: "18:30" },
    { id: "wed-evening", day: "Wednesday", start: "18:30" },
    { id: "sat-morning", day: "Saturday", start: "09:00" },
  ],
};
