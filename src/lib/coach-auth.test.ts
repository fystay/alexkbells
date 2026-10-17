import { describe, expect, it, vi } from "vitest";
import { coachEmails, coachLoginConfig, currentUserEmail, isCoach, refreshSession, signInWithPassword } from "./coach-auth";
import { ACCESS_COOKIE, REFRESH_COOKIE, REFRESH_MAX_AGE, sessionCookies } from "./coach-cookies";

const supabase = { url: "https://ref.supabase.co", secretKey: "sb_secret_x" };
const env = { SUPABASE_URL: supabase.url, SUPABASE_SECRET_KEY: supabase.secretKey, COACH_EMAIL: "Coach@Example.com" };

function respond(status: number, body: unknown) {
  return vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify(body), { status }));
}

const tokenBody = { access_token: "at", refresh_token: "rt", expires_in: 3600, user: { email: "coach@example.com" } };

describe("coach login config", () => {
  it("parses one or more coach addresses, ignoring invalid ones", () => {
    expect(coachEmails({ COACH_EMAIL: " A@x.com, not-an-email ,b@y.co.uk" })).toEqual(["a@x.com", "b@y.co.uk"]);
    expect(coachEmails({})).toEqual([]);
  });

  it("is off without Supabase or a coach address", () => {
    expect(coachLoginConfig(env)).not.toBeNull();
    expect(coachLoginConfig({ ...env, COACH_EMAIL: "" })).toBeNull();
    expect(coachLoginConfig({ ...env, SUPABASE_SECRET_KEY: "" })).toBeNull();
  });

  it("matches coach addresses case-insensitively", () => {
    const config = coachLoginConfig(env)!;
    expect(isCoach(config, " COACH@example.com")).toBe(true);
    expect(isCoach(config, "someone@example.com")).toBe(false);
  });
});

describe("signInWithPassword", () => {
  it("posts the password grant with the secret key and returns the session", async () => {
    const fetchImpl = respond(200, tokenBody);
    const result = await signInWithPassword(supabase, "coach@example.com", "pw", fetchImpl);
    expect(result).toEqual({
      ok: true,
      session: { accessToken: "at", refreshToken: "rt", expiresIn: 3600, email: "coach@example.com" },
    });
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("https://ref.supabase.co/auth/v1/token?grant_type=password");
    expect(init?.headers).toMatchObject({ apikey: "sb_secret_x" });
    expect(JSON.parse(String(init?.body))).toEqual({ email: "coach@example.com", password: "pw" });
  });

  it("maps failures without leaking details", async () => {
    expect(await signInWithPassword(supabase, "a@b.co", "x", respond(400, { error: "invalid_grant" }))).toEqual({ ok: false, reason: "invalid" });
    expect(await signInWithPassword(supabase, "a@b.co", "x", respond(429, {}))).toEqual({ ok: false, reason: "rate-limited" });
    expect(await signInWithPassword(supabase, "a@b.co", "x", respond(500, {}))).toEqual({ ok: false, reason: "unavailable" });
    expect(await signInWithPassword(supabase, "a@b.co", "x", respond(200, { access_token: "only" }))).toEqual({ ok: false, reason: "unavailable" });
    const offline = vi.fn<typeof fetch>().mockRejectedValue(new TypeError("fetch failed"));
    expect(await signInWithPassword(supabase, "a@b.co", "x", offline)).toEqual({ ok: false, reason: "unavailable" });
  });
});

describe("refreshSession", () => {
  it("uses the refresh token grant", async () => {
    const fetchImpl = respond(200, tokenBody);
    expect((await refreshSession(supabase, "rt", fetchImpl)).ok).toBe(true);
    expect(fetchImpl.mock.calls[0][0]).toBe("https://ref.supabase.co/auth/v1/token?grant_type=refresh_token");
  });
});

describe("currentUserEmail", () => {
  it("returns the email for a valid token and null otherwise", async () => {
    const ok = respond(200, { email: "coach@example.com" });
    expect(await currentUserEmail(supabase, "at", ok)).toBe("coach@example.com");
    expect(ok.mock.calls[0][1]?.headers).toMatchObject({ Authorization: "Bearer at" });
    expect(await currentUserEmail(supabase, "bad", respond(401, {}))).toBeNull();
  });
});

describe("sessionCookies", () => {
  it("sets httpOnly cookies scoped to /coach, the access cookie expiring early", () => {
    const [access, refresh] = sessionCookies({ accessToken: "at", refreshToken: "rt", expiresIn: 3600, email: "c@x.com" });
    expect(access[0]).toBe(ACCESS_COOKIE);
    expect(access[2]).toMatchObject({ httpOnly: true, sameSite: "lax", path: "/coach", maxAge: 3540 });
    expect(refresh[0]).toBe(REFRESH_COOKIE);
    expect(refresh[2].maxAge).toBe(REFRESH_MAX_AGE);
  });
});
