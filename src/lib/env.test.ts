import { describe, expect, it } from "vitest";
import { isIndexable, isPreviewDeployment, isProductionDeployment, siteUrl, supabaseConfig } from "./env";

describe("siteUrl", () => {
  it("prefers SITE_URL and normalises it to an origin", () => {
    expect(siteUrl({ SITE_URL: "https://alexkbells.example/" })).toBe("https://alexkbells.example");
    expect(siteUrl({ SITE_URL: "https://alexkbells.example/path" })).toBe("https://alexkbells.example");
  });

  it("ignores an invalid SITE_URL", () => {
    expect(siteUrl({ SITE_URL: "alexkbells dot com", VERCEL_PROJECT_PRODUCTION_URL: "x.vercel.app" })).toBe(
      "https://x.vercel.app",
    );
    expect(siteUrl({ SITE_URL: "javascript:alert(1)" })).toBe("http://localhost:3000");
  });

  it("falls back to the Vercel production URL, then localhost", () => {
    expect(siteUrl({ VERCEL_PROJECT_PRODUCTION_URL: "x.vercel.app" })).toBe("https://x.vercel.app");
    expect(siteUrl({})).toBe("http://localhost:3000");
  });
});

describe("deployment environment", () => {
  it("detects Vercel production only", () => {
    expect(isProductionDeployment({ VERCEL_ENV: "production" })).toBe(true);
    expect(isProductionDeployment({ VERCEL_ENV: "preview" })).toBe(false);
    expect(isProductionDeployment({})).toBe(false);
  });

  it("detects Vercel previews only", () => {
    expect(isPreviewDeployment({ VERCEL_ENV: "preview" })).toBe(true);
    expect(isPreviewDeployment({ VERCEL_ENV: "production" })).toBe(false);
    expect(isPreviewDeployment({ VERCEL_ENV: "development" })).toBe(false);
    expect(isPreviewDeployment({})).toBe(false);
  });

  it("indexes production and plain local builds only", () => {
    expect(isIndexable({ VERCEL_ENV: "production" })).toBe(true);
    expect(isIndexable({ VERCEL_ENV: "production", CONTENT_PREVIEW: "true" })).toBe(true);
    expect(isIndexable({ VERCEL_ENV: "preview" })).toBe(false);
    expect(isIndexable({ VERCEL_ENV: "development" })).toBe(false);
    expect(isIndexable({})).toBe(true);
    expect(isIndexable({ CONTENT_PREVIEW: "true" })).toBe(false);
  });
});

describe("supabaseConfig", () => {
  const url = "https://sqkpixwvugrxllrxlexs.supabase.co";

  it("returns the origin and key when both are set", () => {
    expect(supabaseConfig({ SUPABASE_URL: `${url}/`, SUPABASE_SECRET_KEY: " sb_secret_x " })).toEqual({
      url,
      secretKey: "sb_secret_x",
    });
  });

  it("stays off when either value is missing or the URL is not https", () => {
    expect(supabaseConfig({})).toBeNull();
    expect(supabaseConfig({ SUPABASE_URL: url })).toBeNull();
    expect(supabaseConfig({ SUPABASE_SECRET_KEY: "sb_secret_x" })).toBeNull();
    expect(supabaseConfig({ SUPABASE_URL: "http://example.supabase.co", SUPABASE_SECRET_KEY: "k" })).toBeNull();
    expect(supabaseConfig({ SUPABASE_URL: "not a url", SUPABASE_SECRET_KEY: "k" })).toBeNull();
  });
});
