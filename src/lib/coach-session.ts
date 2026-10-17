import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { coachLoginConfig, currentUserEmail, isCoach } from "./coach-auth";
import { ACCESS_COOKIE, COACH_LOGIN } from "./coach-cookies";

export interface Coach {
  email: string;
}

/**
 * The signed-in coach, verified with Supabase on every request; otherwise a
 * redirect to the login page. Call it in every coach page and Server Action:
 * the proxy only refreshes sessions, it doesn't authorise anything.
 */
export async function requireCoach(): Promise<Coach> {
  const config = coachLoginConfig();
  const token = (await cookies()).get(ACCESS_COOKIE)?.value;
  if (!config || !token) redirect(COACH_LOGIN);
  const email = await currentUserEmail(config.supabase, token);
  if (!email || !isCoach(config, email)) redirect(COACH_LOGIN);
  return { email };
}
