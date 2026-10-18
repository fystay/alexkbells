import { requireCoach, type Coach } from "../coach-session";
import { failure, type ActionState } from "./action-state";
import { coachDb, type Db } from "./db";
import { dbMessage } from "./errors";
import { londonToday, type DateKey } from "./time";

/**
 * Every portal page and Server Action starts here: the coach's session is
 * checked with Supabase (redirecting to the login page otherwise) before any
 * data is read or written.
 */
export async function portalContext(): Promise<{ coach: Coach; db: Db | null; today: DateKey }> {
  const coach = await requireCoach();
  return { coach, db: coachDb(), today: londonToday() };
}

/** For Server Actions: the database, or the message to show when it isn't configured. */
export async function actionContext(): Promise<{ db: Db; today: DateKey; coach: Coach } | { error: ActionState }> {
  const { coach, db, today } = await portalContext();
  if (!db) return { error: failure(dbMessage({ kind: "not-set-up", code: "config" })) };
  return { db, today, coach };
}
