import { describe, expect, it } from "vitest";
import { weekdayIndex } from "./dates";
import { CLASS_WINDOW_DAYS, classAvailability, isClassDate } from "./timetable";

const sessions = [
  { day: "Monday", start: "18:30" },
  { day: "Wednesday", start: "18:30" },
  { day: "Saturday", start: "10:15" },
] as const;

describe("classAvailability", () => {
  // Friday 16 October 2026
  const today = "2026-10-16";
  const window = classAvailability(sessions, today);

  it("lists every class in the next four weeks, from tomorrow, all open to request", () => {
    expect(window.source).toBe("live");
    expect(window.from).toBe("2026-10-17");
    expect(window.days[0]).toEqual({ date: "2026-10-17", slots: [{ id: "class-2026-10-17-10:15", time: "10:15", available: true }] });
    expect(window.days).toHaveLength(12); // 3 a week for 4 weeks
    expect(window.days.every((d) => [0, 2, 5].includes(weekdayIndex(d.date)))).toBe(true);
    expect(window.days.at(-1)!.date <= window.to).toBe(true);
  });

  it("accepts only real class dates inside the window", () => {
    expect(isClassDate("2026-10-19", sessions[0], today)).toBe(true);
    expect(isClassDate("2026-10-20", sessions[0], today)).toBe(false); // a Tuesday
    expect(isClassDate("2026-10-12", sessions[0], today)).toBe(false); // past
    expect(isClassDate("2026-12-28", sessions[0], today)).toBe(false); // beyond CLASS_WINDOW_DAYS
    expect(isClassDate("2026-02-31", sessions[0], today)).toBe(false);
    expect(CLASS_WINDOW_DAYS).toBe(28);
  });
});
