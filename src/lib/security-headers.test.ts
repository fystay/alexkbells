import { describe, expect, it } from "vitest";
import { contentSecurityPolicy, securityHeaders } from "./security-headers";

describe("security headers", () => {
  it("applies a first-party CSP to production builds", () => {
    const csp = contentSecurityPolicy({ NODE_ENV: "production", VERCEL_ENV: "production" });
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("media-src 'self'");
    expect(csp).not.toContain("vercel.live");
    expect(csp).not.toContain("unsafe-eval");
  });

  it("allows the Vercel Toolbar on preview deployments only", () => {
    expect(contentSecurityPolicy({ VERCEL_ENV: "preview" })).toContain("script-src 'self' 'unsafe-inline' https://vercel.live");
  });

  it("omits the CSP in development so fast refresh works", () => {
    const keys = securityHeaders({ NODE_ENV: "development" }).map((h) => h.key);
    expect(keys).not.toContain("Content-Security-Policy");
    expect(keys).toContain("X-Content-Type-Options");
  });
});
