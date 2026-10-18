import { describe, expect, it } from "vitest";
import { cronAuthorized } from "./cron-auth";

describe("cronAuthorized", () => {
  const env = { CRON_SECRET: "a-long-random-cron-secret" };
  it("accepts only the exact bearer secret", () => {
    expect(cronAuthorized("Bearer a-long-random-cron-secret", env)).toBe(true);
    expect(cronAuthorized("Bearer a-long-random-cron-secreT", env)).toBe(false);
    expect(cronAuthorized("a-long-random-cron-secret", env)).toBe(false);
    expect(cronAuthorized(null, env)).toBe(false);
  });
  it("refuses everything without a strong secret", () => {
    expect(cronAuthorized("Bearer ", {})).toBe(false);
    expect(cronAuthorized("Bearer short", { CRON_SECRET: "short" })).toBe(false);
  });
});
