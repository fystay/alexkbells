import type { AuthSession } from "./coach-auth";

/** Session cookies for the coach area. Shared by the proxy and Server Actions. */

export const COACH_HOME = "/coach";
export const COACH_LOGIN = "/coach/login";

export const ACCESS_COOKIE = "akb_coach_access";
export const REFRESH_COOKIE = "akb_coach_refresh";

/** Sign in again after a week, even if Supabase would keep refreshing. */
export const REFRESH_MAX_AGE = 60 * 60 * 24 * 7;

interface CookieOptions {
  httpOnly: true;
  secure: boolean;
  sameSite: "lax";
  path: string;
  maxAge: number;
}

/** httpOnly, so page scripts can't read them; scoped to /coach, so other pages never send them. */
export function cookieOptions(maxAge: number, env: Readonly<Record<string, string | undefined>> = process.env): CookieOptions {
  return { httpOnly: true, secure: env.NODE_ENV === "production" && !isLocalE2E(env), sameSite: "lax", path: COACH_HOME, maxAge };
}

// `next start` in e2e serves plain http on localhost, where Secure cookies are dropped by some browsers.
function isLocalE2E(env: Readonly<Record<string, string | undefined>>): boolean {
  return env.SUPABASE_URL?.startsWith("http://localhost:") ?? false;
}

/** The cookies to set for a fresh session: [name, value, options]. */
export function sessionCookies(session: AuthSession): [string, string, CookieOptions][] {
  // Expire the access cookie a minute early so the proxy refreshes before Supabase rejects it.
  const accessAge = Math.max(60, Math.min(session.expiresIn, 60 * 60) - 60);
  return [
    [ACCESS_COOKIE, session.accessToken, cookieOptions(accessAge)],
    [REFRESH_COOKIE, session.refreshToken, cookieOptions(REFRESH_MAX_AGE)],
  ];
}
