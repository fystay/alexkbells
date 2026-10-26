import { describe, expect, it } from "vitest";
import { isToken, memberCookieOptions, memberLinkOrigin, randomToken, sha256Hex, signInEmail, signInLink } from "./member-auth";

describe("member sign-in tokens", () => {
  it("makes 43-character url-safe tokens that never repeat", () => {
    const a = randomToken();
    const b = randomToken();
    expect(isToken(a)).toBe(true);
    expect(a).not.toBe(b);
  });

  it("only accepts token-shaped values", () => {
    expect(isToken("short")).toBe(false);
    expect(isToken(`${"a".repeat(42)}!`)).toBe(false);
    expect(isToken(null)).toBe(false);
  });

  it("hashes to lower-case hex SHA-256, as the database stores it", async () => {
    expect(await sha256Hex("abc")).toBe("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  });
});

describe("the emailed link", () => {
  it("points at the site's own address on production, never at a request's Host", () => {
    expect(memberLinkOrigin({ VERCEL_ENV: "production", SITE_URL: "https://raeng.example" })).toBe("https://raeng.example");
    expect(signInLink("t".repeat(43), { VERCEL_ENV: "production", SITE_URL: "https://raeng.example" })).toBe(`https://raeng.example/account/confirm?token=${"t".repeat(43)}`);
  });

  it("points at the preview itself on previews", () => {
    expect(memberLinkOrigin({ VERCEL_ENV: "preview", VERCEL_URL: "raeng-abc.vercel.app", SITE_URL: "https://raeng.example" })).toBe("https://raeng-abc.vercel.app");
  });

  it("says how long it lasts and what to do if you didn't ask", () => {
    const email = signInEmail("https://raeng.example/account/confirm?token=x");
    expect(email.text).toContain("15 minutes");
    expect(email.text).toContain("If you didn't ask for this");
  });
});

describe("the session cookie", () => {
  it("is httpOnly, Lax, secure in production and scoped to /account for 30 days", () => {
    expect(memberCookieOptions({ NODE_ENV: "production", SUPABASE_URL: "https://x.supabase.co" })).toEqual({
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/account",
      maxAge: 60 * 60 * 24 * 30,
    });
  });
});
