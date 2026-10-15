import { describe, expect, it } from "vitest";
import { services } from "./services";
import { timetable } from "./classes";
import { faq } from "./faq";
import { journey } from "./journey";

// Guards against accidental publication: anything not yet approved by the
// client must stay provisional. Update deliberately when Alex confirms.
describe("content approval state", () => {
  it("publishes only the prices confirmed on 2026-10-15", () => {
    const confirmed = services
      .flatMap((s) => s.prices.map((p) => `${s.id}:${p.label}:${p.amountGbp}:${p.status}`))
      .sort();
    expect(confirmed).toEqual([
      "one-to-one:Four sessions:130:confirmed",
      "one-to-one:Single session:35:confirmed",
      "online-coaching:Monthly:79:confirmed",
    ]);
    // No group class price has been supplied.
    expect(services.find((s) => s.id === "group-classes")?.prices).toEqual([]);
  });

  it("keeps the timetable provisional until confirmed", () => {
    expect(timetable.status).toBe("provisional");
  });

  it("derives the timetable FAQ status from the timetable", () => {
    expect(faq.find((f) => f.id === "when")?.status).toBe(timetable.status);
  });

  it("never publishes Alex's journey with placeholders or missing photos", () => {
    if (journey.status !== "confirmed") return;
    const text = JSON.stringify(journey);
    expect(text, "replace every [bracketed] placeholder first").not.toMatch(/\[[^\]]+\]/);
    expect(journey.before && journey.after, "add both photos").toBeTruthy();
  });

  it("has unique ids within each list", () => {
    for (const ids of [services.map((s) => s.id), timetable.sessions.map((s) => s.id), faq.map((f) => f.id)]) {
      expect(new Set(ids).size).toBe(ids.length);
    }
  });
});
