import { describe, expect, it } from "vitest";
import { classAvailability } from "./availability/timetable";
import { fullClasses, fullKey } from "./class-capacity";

const env = { SUPABASE_URL: "https://example.supabase.co", SUPABASE_SECRET_KEY: "sb_secret_x" };
const respond = (status: number, body: unknown): typeof fetch => (async () => new Response(JSON.stringify(body), { status })) as typeof fetch;

describe("full classes", () => {
  it("marks a class full only when its capacity is reached", async () => {
    const rows = [
      { slot: "mon-evening", class_date: "2026-11-02", capacity: 10, booked: 10 },
      { slot: "wed-evening", class_date: "2026-11-04", capacity: 10, booked: 9 },
      { slot: "sat-morning", class_date: "2026-11-07", capacity: 1, booked: 3 },
    ];
    expect(await fullClasses("2026-10-30", env, respond(200, rows))).toEqual({ known: true, keys: ["mon-evening|2026-11-02", "sat-morning|2026-11-07"] });
  });

  it("is unknown (nothing full) when the database isn't configured or doesn't answer", async () => {
    expect(await fullClasses("2026-10-30", {}, respond(200, []))).toEqual({ known: false, keys: [] });
    expect(await fullClasses("2026-10-30", env, respond(503, {}))).toEqual({ known: false, keys: [] });
    const broken = (async () => {
      throw new Error("down");
    }) as typeof fetch;
    expect(await fullClasses("2026-10-30", env, broken)).toEqual({ known: false, keys: [] });
  });

  it("asks only for capacity data in the booking window, with the secret key", async () => {
    let seen = "";
    let key = "";
    const spy = (async (url: string, init?: RequestInit) => {
      seen = url;
      key = String((init?.headers as Record<string, string>).apikey);
      return new Response("[]", { status: 200 });
    }) as typeof fetch;
    await fullClasses("2026-10-30", env, spy);
    expect(seen).toContain("/rest/v1/akb_class_overview?select=slot%2Cclass_date%2Ccapacity%2Cbooked");
    expect(seen).toContain("class_date=gte.2026-10-30");
    expect(seen).toContain("capacity=not.is.null");
    expect(key).toBe("sb_secret_x");
  });

  it("shows a full class as fully booked in the calendar", () => {
    const sessions = [{ id: "mon-evening", day: "Monday", start: "18:30" }] as const;
    const w = classAvailability(sessions, "2026-10-30", new Set([fullKey("mon-evening", "2026-11-02")]));
    const slot = (date: string) => w.days.find((d) => d.date === date)?.slots[0];
    expect(slot("2026-11-02")?.available).toBe(false);
    expect(slot("2026-11-09")?.available).toBe(true);
  });
});
