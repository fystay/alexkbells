import type { Timetable } from "./types";

/**
 * Group class timetable as supplied by the client.
 *
 * Status is "provisional" until Alex confirms: start date of the new
 * timetable, that every session runs weekly, and class duration.
 * Flip to "confirmed" to publish on production. See CONTENT.md.
 */
export const timetable: Timetable = {
  status: "provisional",
  sessions: [
    { id: "mon-evening", day: "Monday", start: "18:30" },
    { id: "wed-evening", day: "Wednesday", start: "18:30" },
    { id: "sat-morning", day: "Saturday", start: "09:00" },
  ],
};
