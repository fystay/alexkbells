import { cookies } from "next/headers";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { coachDb, type Db } from "./coach/db";
import { isToken, MEMBER_SESSION_COOKIE, sessionClient, sha256Hex, SIGN_IN_PATH } from "./member-auth";

export interface Member {
  clientId: string;
  db: Db;
  /** The hash of this browser's session, for signing it out. */
  sessionHash: string;
}

/**
 * The signed-in member, checked with the database on every request (an
 * ended or expired session, or a membership that has ended, is nobody), or
 * null. The cookie holds a random value; only its hash is ever sent to the
 * database.
 */
export async function currentMember(): Promise<Member | null> {
  // Request time only: otherwise Next's prerender pass starts the session
  // lookup and cancels it when the pass ends (logged as a failed call).
  await connection();
  const db = coachDb();
  const raw = (await cookies()).get(MEMBER_SESSION_COOKIE)?.value;
  if (!db || !isToken(raw)) return null;
  const sessionHash = await sha256Hex(raw);
  const result = await sessionClient(db, sessionHash);
  if (!result.ok || !result.data) return null;
  return { clientId: result.data, db, sessionHash };
}

/** Every account page and action starts here: the member, or the sign-in page. */
export async function requireMember(): Promise<Member> {
  const member = await currentMember();
  if (!member) redirect(SIGN_IN_PATH);
  return member;
}
