import { describe, expect, it } from "vitest";
import { siteUrl } from "./env";

describe("siteUrl", () => {
  it("prefers SITE_URL and strips trailing slashes", () => {
    expect(siteUrl({ SITE_URL: "https://alexkbells.example/" })).toBe(
      "https://alexkbells.example",
    );
  });

  it("falls back to the Vercel production URL, then localhost", () => {
    expect(siteUrl({ VERCEL_PROJECT_PRODUCTION_URL: "x.vercel.app" })).toBe(
      "https://x.vercel.app",
    );
    expect(siteUrl({})).toBe("http://localhost:3000");
  });
});
