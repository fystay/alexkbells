import type { Timetable } from "./types";

/**
 * Group class timetable as supplied by the client.
 *
 * Confirmed for publication by the project owner on 2026-10-15; the
 * 60-minute length on 2026-10-17 (Alex's own class listing); Saturday moved to
 * 9:00 am by the owner on 2026-10-22 (latest schedule supplied by Alex). See CORE.md.
 * Class names and one-line descriptions: from Alex's own mockup (via the owner, 2026-10-29).
 */
export const timetable: Timetable = {
  status: "confirmed",
  sessions: [
    { id: "mon-evening", day: "Monday", start: "18:30", durationMinutes: 60, name: "HIIT", description: "Kettlebell conditioning and full-body training." },
    { id: "wed-evening", day: "Wednesday", start: "18:30", durationMinutes: 60, name: "Doubles Kettlebells", description: "Build strength and coordination using two kettlebells." },
    { id: "sat-morning", day: "Saturday", start: "09:00", durationMinutes: 60, name: "Saturday Conditioning", description: "A varied session to build strength and fitness." },
  ],
};

/**
 * The usual group class size (owner, 2026-10-29: 12 for now). Alex changes it
 * in the coach portal (stored in the database); this is what applies until he
 * does, and if the database can't be read.
 */
export const defaultClassCapacity = 12;

/**
 * How Alex describes every group class (his class listing, supplied by the
 * project owner 2026-10-17). Shown when someone picks a class date.
 */
export const groupClass = {
  name: "Kettlebell Training",
  description:
    "A 60-minute kettlebell training session designed to build strength, conditioning and movement quality. Suitable for all experience levels, with exercises scaled to your ability.",
  payment: "Pay by bank transfer or cash.",
  /** Shown with the length on the chosen class in the booking form (owner, 2026-10-28; the description says the same). */
  level: "All levels",
  /** The same, as the short labels on /classes. */
  paymentMethods: ["Bank transfer", "Cash"],
} as const;

/**
 * Booking a group class and paying online (owner's decisions, 2026-10-27):
 * the place is held for 15 minutes while paying; cancelling 24 hours or more
 * before gives a credit for another class within 4 weeks; later, or not
 * turning up, the class is used. The same numbers are in the database
 * (supabase/migrations/20261029000000_akb_instant_class_booking.sql), which
 * enforces them. Shown only where online payment is on.
 */
export const onlineClassBooking = {
  payment: "Pay online when you book.",
  paymentMethods: ["Pay online when you book"],
  hold: "Your place is held for 15 minutes while you pay.",
  cancel:
    "Cancel 24 hours or more before and you get a credit for another class within 4 weeks. Later than that, or not turning up, the class is used.",
} as const;
