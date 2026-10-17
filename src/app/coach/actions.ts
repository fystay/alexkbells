"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { coachLoginConfig, isCoach, signInWithPassword, signOut } from "@/lib/coach-auth";
import { ACCESS_COOKIE, COACH_HOME, COACH_LOGIN, REFRESH_COOKIE, sessionCookies } from "@/lib/coach-cookies";
import { isValidEmail } from "@/lib/form-validation";

export interface LoginState {
  message: string;
  /** Echoed back so a failed attempt doesn't clear the email field. */
  email: string;
}

const MESSAGES = {
  invalid: "That email and password don't match. Check them and try again.",
  "rate-limited": "Too many attempts. Wait a few minutes, then try again.",
  unavailable: "Sign-in isn't working right now. Try again in a few minutes.",
  off: "Coach login isn't set up yet.",
} as const;

/**
 * Signs the coach in. Only COACH_EMAIL addresses are sent to Supabase; any
 * other address gets the same message as a wrong password.
 */
export async function signInCoach(_previous: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().slice(0, 254);
  const password = String(formData.get("password") ?? "").slice(0, 200);

  const config = coachLoginConfig();
  if (!config) return { message: MESSAGES.off, email };
  if (!isValidEmail(email) || !password) return { message: "Enter your email and password.", email };
  if (!isCoach(config, email)) return { message: MESSAGES.invalid, email };

  const result = await signInWithPassword(config.supabase, email, password);
  if (!result.ok) return { message: MESSAGES[result.reason], email };

  const jar = await cookies();
  for (const [name, value, options] of sessionCookies(result.session)) jar.set(name, value, options);
  redirect(COACH_HOME);
}

export async function signOutCoach(): Promise<void> {
  const jar = await cookies();
  const config = coachLoginConfig();
  const token = jar.get(ACCESS_COOKIE)?.value;
  if (config && token) await signOut(config.supabase, token);
  jar.delete({ name: ACCESS_COOKIE, path: COACH_HOME });
  jar.delete({ name: REFRESH_COOKIE, path: COACH_HOME });
  redirect(COACH_LOGIN);
}
