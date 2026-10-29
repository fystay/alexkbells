import { describe, expect, it } from "vitest";
import { classStatuses } from "./class-status";

const classes = [
  { id: "mon-evening", day: "Monday" as const, start: "18:30" as const },
  { id: "wed-evening", day: "Wednesday" as const, start: "18:30" as const },
  { id: "sat-morning", day: "Saturday" as const, start: "09:00" as const },
];
// Sunday 2026-11-01: the next Monday is 2026-11-02, then Wednesday 2026-11-04, Saturday 2026-11-07.
const today = "2026-11-01";

describe("classStatuses", () => {
  it("marks nothing full when nothing is", () => {
    const s = classStatuses(classes, today, new Set(), new Set());
    expect([...s.values()].map((x) => x.full)).toEqual([false, false, false]);
  });

  it("marks a class fully booked on its next date and sends people to the next class with a place", () => {
    const s = classStatuses(
      classes,
      today,
      new Set(["mon-evening|2026-11-02"]),
      new Set(),
    );
    expect(s.get("mon-evening")).toEqual({
      full: true,
      redirect: {
        id: "wed-evening",
        date: "2026-11-04",
        day: "Wednesday",
        start: "18:30",
      },
    });
    expect(s.get("wed-evening")).toEqual({ full: false, redirect: null });
  });

  it("skips cancelled classes and moves to the following week when the others are full too", () => {
    const full = new Set([
      "mon-evening|2026-11-02",
      "wed-evening|2026-11-04",
      "sat-morning|2026-11-07",
    ]);
    const s = classStatuses(classes, today, full, new Set());
    expect(s.get("mon-evening")?.redirect).toEqual({
      id: "mon-evening",
      date: "2026-11-09",
      day: "Monday",
      start: "18:30",
    });
    const c = classStatuses(
      classes,
      today,
      new Set(["mon-evening|2026-11-02"]),
      new Set(["wed-evening|2026-11-04"]),
    );
    expect(c.get("mon-evening")?.redirect?.id).toBe("sat-morning");
    // A cancelled date is skipped: Wednesday's next date is the week after, and it is open.
    expect(c.get("wed-evening")?.full).toBe(false);
  });

  it("has no redirect when nothing has a place in the window", () => {
    const every = new Set<string>();
    for (let d = 1; d <= 30; d++) {
      for (const c of classes) {
        every.add(`${c.id}|2026-11-${String(d).padStart(2, "0")}`);
        every.add(`${c.id}|2026-12-${String(d).padStart(2, "0")}`);
      }
    }
    const s = classStatuses(classes, today, every, new Set());
    expect(s.get("mon-evening")).toEqual({ full: true, redirect: null });
  });
});
