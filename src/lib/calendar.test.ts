import { describe, expect, it } from "vitest";
import { icsFor, type ClassEvent } from "./calendar";

const event: ClassEvent = {
  id: "0f6c6f0e-1b0a-4f4e-9d0e-2b1c3d4e5f60",
  title: "Kettlebell Training, RAENG",
  // 6:30 pm in London on 2 November 2026 (GMT).
  startsAt: "2026-11-02T18:30:00.000Z",
  durationMinutes: 60,
  location: "Media House, 1A Dunns Wood Road, Cumbernauld, G67 3EN",
  description: "Booked in your RAENG account; to cancel, sign in at https://raengfitness.vercel.app/account",
};

describe("icsFor", () => {
  const ics = icsFor(event, new Date("2026-10-28T12:00:00Z"));

  it("is one event in UTC with the class's start and end", () => {
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(ics).toContain("\r\nDTSTART:20261102T183000Z\r\n");
    expect(ics).toContain("\r\nDTEND:20261102T193000Z\r\n");
    expect(ics).toContain("\r\nDTSTAMP:20261028T120000Z\r\n");
    expect(ics).toContain(`\r\nUID:${event.id}@raeng-fitness\r\n`);
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(1);
  });

  it("escapes commas and semicolons in text", () => {
    expect(ics).toContain("SUMMARY:Kettlebell Training\\, RAENG");
    expect(ics).toContain("LOCATION:Media House\\, 1A Dunns Wood Road\\, Cumbernauld\\, G67 3EN");
    expect(ics).toContain("RAENG account\\; to cancel");
  });

  it("folds lines to 75 octets", () => {
    for (const line of ics.split("\r\n")) expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    // Unfolding gives the description back.
    expect(ics.replace(/\r\n /g, "")).toContain("DESCRIPTION:Booked in your RAENG account\\; to cancel\\, sign in at https://raengfitness.vercel.app/account");
  });
});
