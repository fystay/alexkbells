import { type Env, siteUrl } from "./env";
import { rpc, type Db, type DbResult } from "./coach/db";

/**
 * Member accounts (owner, 2026-10-26; docs/MEMBER_ACCOUNTS_DRAFT.md): our own
 * one-time email links, no passwords and no Supabase Auth users. The
 * database (migration 20261027000000_akb_member_accounts.sql) stores only
 * SHA-256 hashes of links and sessions; these helpers make the random
 * values, hash them, and call the member functions with the secret key on
 * the server. Members never get database access.
 */

export const ACCOUNT_PATH = "/account";
export const SIGN_IN_PATH = "/account/sign-in";
export const CONFIRM_PATH = "/account/confirm";
export const MEMBER_SESSION_COOKIE = "akb_member_session";
/** Matches the database: sessions last 30 days. */
export const MEMBER_SESSION_MAX_AGE = 60 * 60 * 24 * 30;

/** 32 random bytes, base64url: 43 characters. Used for sign-in links and sessions. */
export function randomToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** Only values shaped like randomToken() are ever looked up. */
export function isToken(value: string | null | undefined): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{43}$/.test(value);
}

/** Lower-case hex SHA-256, as the database stores it. */
export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** httpOnly so page scripts can't read it; only sent to /account pages. */
export function memberCookieOptions(env: Env = process.env) {
  // Plain http only for the local e2e stand-in, like the coach cookies.
  const local = env.SUPABASE_URL?.startsWith("http://localhost:") ?? false;
  return { httpOnly: true, secure: env.NODE_ENV === "production" && !local, sameSite: "lax" as const, path: ACCOUNT_PATH, maxAge: MEMBER_SESSION_MAX_AGE };
}

/**
 * Where the emailed link points. Never taken from the request's Host header
 * (a forged header would put someone else's domain in the email): the site's
 * own address on production, the preview's own address on previews.
 */
export function memberLinkOrigin(env: Env = process.env): string {
  if (env.VERCEL_ENV === "preview" && env.VERCEL_URL) return `https://${env.VERCEL_URL}`;
  return siteUrl(env);
}

export function signInLink(token: string, env: Env = process.env): string {
  return `${memberLinkOrigin(env)}${CONFIRM_PATH}?token=${token}`;
}

/** The sign-in email. Plain text. */
export function signInEmail(link: string): { subject: string; text: string } {
  return {
    subject: "Your RAENG sign-in link",
    text: [
      "Here's your link to sign in to your RAENG membership:",
      "",
      link,
      "",
      "It works once, for the next 15 minutes. On the page it opens, press Sign in.",
      "",
      "If you didn't ask for this, you can ignore this email: nobody can sign in without the link.",
    ].join("\n"),
  };
}

// ---------------------------------------------------------------------------
// The member functions (server only, secret key)
// ---------------------------------------------------------------------------

export function createLoginLink(db: Db, email: string, tokenHash: string): Promise<DbResult<boolean>> {
  return rpc<boolean>(db, "akb_member_create_login_link", { p_email: email, p_token_hash: tokenHash });
}

export function redeemLoginLink(db: Db, tokenHash: string, sessionHash: string): Promise<DbResult<string | null>> {
  return rpc<string | null>(db, "akb_member_redeem_login_link", { p_token_hash: tokenHash, p_session_hash: sessionHash });
}

export function sessionClient(db: Db, sessionHash: string): Promise<DbResult<string | null>> {
  return rpc<string | null>(db, "akb_member_session_client", { p_session_hash: sessionHash });
}

export function signOut(db: Db, sessionHash: string, everywhere: boolean): Promise<DbResult<null>> {
  return rpc<null>(db, "akb_member_sign_out", { p_session_hash: sessionHash, p_everywhere: everywhere });
}

export interface MemberPlace {
  id: string;
  class_date: string;
  starts_at: string;
  slot: string;
  status: "booked" | "attended" | "cancelled" | "no_show";
  late_cancel: boolean;
  with_credit: boolean;
  class_cancelled: boolean;
  can_cancel: boolean;
  credit_back_if_cancelled: boolean;
}

export interface MemberOverview {
  membership: {
    plan: string;
    plan_name: string;
    status: "active" | "paused" | "cancelled";
    price_pence: number;
    credits: number;
    start_on: string;
    cancelled_on: string | null;
    renews_on: string | null;
  } | null;
  period: { start: string; end: string; credits: number; used: number; left: number } | null;
  places: MemberPlace[];
}

export function memberOverview(db: Db, clientId: string): Promise<DbResult<MemberOverview>> {
  return rpc<MemberOverview>(db, "akb_member_overview", { p_client: clientId });
}

export function bookWithCredit(
  db: Db,
  args: { clientId: string; slot: string; date: string; startsAt: string; durationMinutes: number },
): Promise<DbResult<string>> {
  return rpc<string>(db, "akb_member_book_class", {
    p_client: args.clientId,
    p_slot: args.slot,
    p_date: args.date,
    p_starts_at: args.startsAt,
    p_duration: args.durationMinutes,
  });
}

/** True when the cancellation was late (the credit is used). */
export function cancelPlace(db: Db, clientId: string, attendanceId: string): Promise<DbResult<boolean>> {
  return rpc<boolean>(db, "akb_member_cancel_place", { p_client: clientId, p_attendance: attendanceId });
}
