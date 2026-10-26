"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { bookingDeliveryConfig, isSpam, text, type FormState } from "@/lib/booking-request";
import { isClassDate } from "@/lib/availability/timetable";
import { publishedClasses } from "@/lib/class-sessions";
import { coachDb, isUuid } from "@/lib/coach/db";
import { londonToday, londonToUtc } from "@/lib/coach/time";
import { emailError, singleLine } from "@/lib/form-validation";
import {
  ACCOUNT_PATH,
  bookWithCredit,
  cancelPlace,
  createLoginLink,
  isToken,
  MEMBER_SESSION_COOKIE,
  memberCookieOptions,
  randomToken,
  redeemLoginLink,
  sha256Hex,
  SIGN_IN_PATH,
  signInEmail,
  signInLink,
  signOut,
} from "@/lib/member-auth";
import { requireMember } from "@/lib/member-session";
import { sendEmailWithRetry } from "@/lib/send-email";

export type SignInField = "email";

/**
 * Sends a one-time sign-in link to a member's email. The visitor sees the
 * same message whether or not the address is a member's (so the form can't
 * be used to find out who is), and nothing says whether an email went.
 */
export async function requestSignInLink(_previous: FormState<SignInField>, formData: FormData): Promise<FormState<SignInField>> {
  const db = coachDb();
  const mail = bookingDeliveryConfig();
  if (!db || !mail) {
    return { status: "error", message: "Signing in by email isn't available yet. Please message Alex on Instagram.", errors: {} };
  }
  if (isSpam(formData)) {
    return { status: "error", message: "Please wait a few seconds and try again.", errors: {} };
  }
  const email = singleLine(text(formData, "email")).toLowerCase();
  const error = emailError(email);
  if (error) return { status: "error", message: "Please check your email address.", errors: { email: error } };

  const token = randomToken();
  const tokenHash = await sha256Hex(token);
  const created = await createLoginLink(db, email, tokenHash);
  if (!created.ok) {
    console.error(`Member sign-in link failed (${created.error.kind} ${created.error.code})`);
    return { status: "error", message: "Sorry, something went wrong. Please try again in a minute.", errors: {} };
  }
  if (created.data) {
    const sent = await sendEmailWithRetry(mail, {
      ...signInEmail(signInLink(token)),
      to: email,
      replyTo: mail.to,
      idempotencyKey: `member-sign-in/${tokenHash}`,
    });
    // Logged without the address; the visitor sees the same message either way.
    if (!sent.ok) console.error(`Member sign-in email failed (${sent.status ?? "network"})`);
  }
  return { status: "success", message: email, errors: {} };
}

/**
 * Uses a sign-in link: only from the button on /account/confirm (a POST),
 * so an email scanner opening the link can't use it up.
 */
export async function confirmSignIn(formData: FormData): Promise<void> {
  const token = text(formData, "token");
  const db = coachDb();
  if (!db || !isToken(token)) redirect(`${SIGN_IN_PATH}?link=invalid`);
  const session = randomToken();
  const result = await redeemLoginLink(db, await sha256Hex(token), await sha256Hex(session));
  if (!result.ok || !result.data) redirect(`${SIGN_IN_PATH}?link=invalid`);
  (await cookies()).set(MEMBER_SESSION_COOKIE, session, memberCookieOptions());
  redirect(ACCOUNT_PATH);
}

/** What the account page says after an action (?done= or ?error=). */
const RULES: Record<string, string> = {
  class_full: "class_full",
  class_cancelled: "class_cancelled",
  no_credits: "no_credits",
  already_booked: "already_booked",
  class_started: "class_started",
  no_membership: "outside_period",
  not_found: "not_found",
  not_booked: "not_found",
  not_credit_place: "not_found",
};

/**
 * Books a class with a credit. The class's start time and length come from
 * the published timetable, never from the form: the form only says which
 * timetable class and which date.
 */
export async function bookClass(formData: FormData): Promise<void> {
  const member = await requireMember();
  const slot = publishedClasses().find((c) => c.id === text(formData, "slot"));
  const date = text(formData, "date");
  if (!slot || !isClassDate(date, slot, londonToday())) redirect(`${ACCOUNT_PATH}?error=not_found`);
  const result = await bookWithCredit(member.db, {
    clientId: member.clientId,
    slot: slot.id,
    date,
    startsAt: londonToUtc(date, slot.start),
    durationMinutes: slot.durationMinutes ?? 60,
  });
  if (!result.ok) redirect(`${ACCOUNT_PATH}?error=${result.error.kind === "rule" ? (RULES[result.error.rule ?? ""] ?? "failed") : "failed"}`);
  redirect(`${ACCOUNT_PATH}?done=booked`);
}

/** Cancels one of the member's own places. Late cancellations are confirmed on the page first. */
export async function cancelClass(formData: FormData): Promise<void> {
  const member = await requireMember();
  const id = text(formData, "place");
  if (!isUuid(id)) redirect(`${ACCOUNT_PATH}?error=not_found`);
  const result = await cancelPlace(member.db, member.clientId, id);
  if (!result.ok) redirect(`${ACCOUNT_PATH}?error=${result.error.kind === "rule" ? (RULES[result.error.rule ?? ""] ?? "failed") : "failed"}`);
  redirect(`${ACCOUNT_PATH}?done=${result.data ? "cancelled_late" : "cancelled"}`);
}

/** Signs this browser out, or every device (everywhere=yes). */
export async function signOutMember(formData: FormData): Promise<void> {
  const member = await requireMember();
  await signOut(member.db, member.sessionHash, text(formData, "everywhere") === "yes");
  (await cookies()).delete({ name: MEMBER_SESSION_COOKIE, path: ACCOUNT_PATH });
  redirect(`${SIGN_IN_PATH}?signed=out`);
}
