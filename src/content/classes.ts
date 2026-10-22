import type { Timetable } from "./types";

/**
 * Group class timetable as supplied by the client.
 *
 * Confirmed for publication by the project owner on 2026-10-15; the
 * 60-minute length on 2026-10-17 (Alex's own class listing); Saturday moved to
 * 9:00 am by the owner on 2026-10-22 (latest schedule supplied by Alex). See CORE.md.
 */
export const timetable: Timetable = {
  status: "confirmed",
  sessions: [
    { id: "mon-evening", day: "Monday", start: "18:30", durationMinutes: 60 },
    { id: "wed-evening", day: "Wednesday", start: "18:30", durationMinutes: 60 },
    { id: "sat-morning", day: "Saturday", start: "09:00", durationMinutes: 60 },
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
