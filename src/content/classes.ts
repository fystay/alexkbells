import type { Timetable } from "./types";

/**
 * Group class timetable as supplied by the client.
 *
 * Confirmed for publication by the project owner on 2026-10-15; Saturday
 * moved to 10:15 and the 60-minute length confirmed on 2026-10-17 (from
 * Alex's own class listing). See CORE.md.
 */
export const timetable: Timetable = {
  status: "confirmed",
  sessions: [
    { id: "mon-evening", day: "Monday", start: "18:30", durationMinutes: 60 },
    { id: "wed-evening", day: "Wednesday", start: "18:30", durationMinutes: 60 },
    { id: "sat-morning", day: "Saturday", start: "10:15", durationMinutes: 60 },
  ],
};

/**
 * How Alex describes every group class (his class listing, supplied by the
 * project owner 2026-10-17). Shown when someone picks a class date.
 */
export const groupClass = {
  name: "Kettlebell Training",
  description:
    "A 60-minute kettlebell training session designed to build strength, conditioning and movement quality. Suitable for all experience levels, with exercises scaled to your ability.",
  payment: "Pay by bank transfer or cash.",
} as const;
