import { describe, expect, it } from "vitest";
import type { ClassSession } from "@/content/types";
import { describeTimetable, formatGbp, formatTime, groupedSessions, partOfDay, sortSessions } from "./schedule";

describe("formatTime", () => {
  it.each([
    ["18:30", "6:30 pm"],
    ["09:00", "9:00 am"],
    ["00:05", "12:05 am"],
    ["12:00", "12:00 pm"],
  ] as const)("%s -> %s", (input, expected) => {
    expect(formatTime(input)).toBe(expected);
  });

  it("rejects invalid times", () => {
    expect(() => formatTime("25:00")).toThrow();
    expect(() => formatTime("6:3" as `${number}:${number}`)).toThrow();
  });
});

describe("sortSessions", () => {
  it("orders by weekday then start time", () => {
    const sessions: ClassSession[] = [
      { id: "c", day: "Saturday", start: "09:00" },
      { id: "b", day: "Monday", start: "18:30" },
      { id: "a", day: "Monday", start: "07:00" },
    ];
    expect(sortSessions(sessions).map((s) => s.id)).toEqual(["a", "b", "c"]);
  });

  it("does not mutate its input", () => {
    const sessions: ClassSession[] = [
      { id: "b", day: "Wednesday", start: "18:30" },
      { id: "a", day: "Monday", start: "18:30" },
    ];
    sortSessions(sessions);
    expect(sessions[0].id).toBe("b");
  });
});

describe("describeTimetable", () => {
  it("joins sessions in natural English", () => {
    expect(
      describeTimetable([
        { id: "s", day: "Saturday", start: "09:00" },
        { id: "m", day: "Monday", start: "18:30" },
        { id: "w", day: "Wednesday", start: "18:30" },
      ]),
    ).toBe("Monday at 6:30 pm, Wednesday at 6:30 pm and Saturday at 9:00 am");
  });

  it("handles one or zero sessions", () => {
    expect(describeTimetable([{ id: "m", day: "Monday", start: "18:30" }])).toBe("Monday at 6:30 pm");
    expect(describeTimetable([])).toBe("");
  });
});

describe("partOfDay", () => {
  it("classifies times", () => {
    expect(partOfDay("09:00")).toBe("Morning");
    expect(partOfDay("13:00")).toBe("Afternoon");
    expect(partOfDay("18:30")).toBe("Evening");
  });
});

describe("formatGbp", () => {
  it("omits pence for whole pounds", () => {
    expect(formatGbp(35)).toBe("£35");
    expect(formatGbp(7.5)).toBe("£7.50");
  });
});

describe("groupedSessions", () => {
  it("groups days that share a time, in weekday order", () => {
    expect(
      groupedSessions([
        { id: "s", day: "Saturday", start: "10:15" },
        { id: "w", day: "Wednesday", start: "18:30" },
        { id: "m", day: "Monday", start: "18:30" },
      ]),
    ).toEqual([
      { days: "Mon & Wed", time: "6:30 pm" },
      { days: "Sat", time: "10:15 am" },
    ]);
  });
});
