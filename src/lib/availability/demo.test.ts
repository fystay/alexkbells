import { describe, expect, it } from "vitest";
import { DEMO_WINDOW_DAYS, demoAvailability, demoAvailabilityProvider } from "./demo";
import { addDays, monthGrid, weekdayIndex } from "./dates";
import { dayStatus } from "./types";
import { timetable } from "@/content/classes";

const TODAY = "2026-10-15"; // a Thursday

describe("demoAvailability", () => {
  for (const service of ["group-class", "one-to-one"] as const) {
    it(`${service}: is labelled demo and stays inside the window`, () => {
      const w = demoAvailability(service, TODAY);
      expect(w.source).toBe("demo");
      expect(w.from).toBe("2026-10-16");
      expect(w.to).toBe(addDays(TODAY, DEMO_WINDOW_DAYS));
      for (const day of w.days) expect(day.date >= w.from && day.date <= w.to).toBe(true);
    });

    it(`${service}: does not make every weekday available`, () => {
      const w = demoAvailability(service, TODAY);
      const weekdays = new Set(w.days.map((d) => weekdayIndex(d.date)));
      expect(weekdays.size).toBeLessThan(7);
      expect(w.days.length).toBeLessThan(DEMO_WINDOW_DAYS);
    });

    it(`${service}: shows available and fully booked dates`, () => {
      const statuses = demoAvailability(service, TODAY).days.map(dayStatus);
      expect(statuses).toContain("available");
      expect(statuses).toContain("full");
    });

    it(`${service}: is deterministic`, () => {
      expect(demoAvailability(service, TODAY)).toEqual(demoAvailability(service, TODAY));
    });
  }

  it("uses different days from Alex's own timetable, so it can't be mistaken for it", () => {
    const real = new Set(timetable.sessions.map((s) => s.day));
    const names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    for (const day of demoAvailability("group-class", TODAY).days) {
      expect(real.has(names[weekdayIndex(day.date)] as never)).toBe(false);
    }
  });

  it("offers different sessions for one-to-one and group classes", () => {
    const group = demoAvailability("group-class", TODAY).days.map((d) => d.date);
    const one = demoAvailability("one-to-one", TODAY).days.map((d) => d.date);
    expect(group).not.toEqual(one);
  });

  it("is exposed through the provider interface", async () => {
    await expect(demoAvailabilityProvider.getAvailability("group-class", TODAY)).resolves.toMatchObject({ source: "demo" });
  });
});

describe("dates", () => {
  it("adds days across month and clock-change boundaries", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2026-10-24", 2)).toBe("2026-10-26");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });

  it("builds a Monday-first month grid", () => {
    const grid = monthGrid("2026-10-15"); // 1 October 2026 is a Thursday
    expect(grid.slice(0, 4)).toEqual([null, null, null, "2026-10-01"]);
    expect(grid.filter(Boolean)).toHaveLength(31);
  });
});
