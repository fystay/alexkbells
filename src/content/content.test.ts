import { describe, expect, it } from "vitest";
import { services } from "./services";
import { timetable } from "./classes";
import { faq } from "./faq";

// Guards against accidental publication: anything not yet approved by the
// client must stay provisional. Update deliberately when Alex confirms.
describe("content approval state", () => {
  it("keeps every unconfirmed price provisional", () => {
    const prices = services.flatMap((s) => s.prices);
    expect(prices.length).toBeGreaterThan(0);
    for (const price of prices) expect(price.status).toBe("provisional");
  });

  it("keeps the timetable provisional until confirmed", () => {
    expect(timetable.status).toBe("provisional");
  });

  it("derives the timetable FAQ status from the timetable", () => {
    expect(faq.find((f) => f.id === "when")?.status).toBe(timetable.status);
  });

  it("has unique ids within each list", () => {
    for (const ids of [services.map((s) => s.id), timetable.sessions.map((s) => s.id), faq.map((f) => f.id)]) {
      expect(new Set(ids).size).toBe(ids.length);
    }
  });
});
