import { describe, expect, it } from "vitest";
import { formatProgramme, parseProgramme } from "./programme-text";

const text = `Week 1
Day A
Two-hand swing | 5 | 10 | 24 kg
Strict press | 4 | 5 each | 16 kg | Pause 2 s at the top. | https://youtu.be/abc.def
Day B
Snatch | 6 | 5 each | 16 kg

Week 3
Day A
Two-hand swing | 5 | 10 | 28 kg`;

describe("parseProgramme", () => {
  const r = parseProgramme(text, 4);

  it("reads weeks, days and exercises in order", () => {
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.items[0]).toEqual({ week: 1, day: "Day A", position: 1, name: "Two-hand swing", sets: 5, reps: "10", load: "24 kg", note: "", video_url: null });
    expect(r.items[1]).toMatchObject({ position: 2, name: "Strict press", note: "Pause 2 s at the top.", video_url: "https://youtu.be/abc.def" });
    expect(r.items[2]).toMatchObject({ day: "Day B", position: 1, name: "Snatch" });
  });

  it("repeats the nearest earlier week for weeks left out", () => {
    if (!r.ok) throw new Error(r.error);
    const week = (w: number) => r.items.filter((i) => i.week === w).map((i) => `${i.day}:${i.name}:${i.load}`);
    expect(week(2)).toEqual(week(1));
    expect(week(3)).toEqual(["Day A:Two-hand swing:28 kg"]);
    expect(week(4)).toEqual(week(3));
  });

  it("treats exercises before any Week heading as week 1", () => {
    const one = parseProgramme("Day A\nSwing | 3 | 10 | 16 kg", 2);
    expect(one.ok && one.items.map((i) => i.week)).toEqual([1, 2]);
  });

  it("says which line is wrong", () => {
    expect(parseProgramme("Day A\nSwing | x | 10", 2)).toEqual({ ok: false, error: 'Line 2: "Swing" needs a number of sets from 1 to 20.' });
    expect(parseProgramme("Swing | 3 | 10", 2)).toMatchObject({ ok: false, error: expect.stringContaining("Line 1: put a day name") });
    expect(parseProgramme("Day A\nSwing | 3 | 10 | 16 kg | | http://example.com/x", 2)).toMatchObject({ ok: false, error: expect.stringContaining("https://") });
    expect(parseProgramme("Week 9\nDay A\nSwing | 3 | 10", 6)).toMatchObject({ ok: false, error: expect.stringContaining("outside the 6 weeks") });
    expect(parseProgramme("Week 1\nDay A\nSwing | 3 | 10\nWeek 1\nDay A\nSwing | 3 | 10", 6)).toMatchObject({ ok: false, error: expect.stringContaining("written twice") });
    expect(parseProgramme("   \n", 6)).toEqual({ ok: false, error: "Write at least one exercise." });
  });

  it("refuses a video that isn't a link to a hosted video (no uploads, no scripts)", () => {
    expect(parseProgramme("Day A\nSwing | 3 | 10 | | | javascript:alert(1)", 1).ok).toBe(false);
  });
});

describe("formatProgramme", () => {
  it("writes only the weeks that differ, and reads back to the same programme", () => {
    const parsed = parseProgramme(text, 4);
    if (!parsed.ok) throw new Error(parsed.error);
    const out = formatProgramme(parsed.items);
    expect(out.match(/^Week \d+$/gm)).toEqual(["Week 1", "Week 3"]);
    expect(parseProgramme(out, 4)).toEqual(parsed);
  });
});
