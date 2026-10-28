"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { bookingDeliveryConfig, isSpam, text, type FormState } from "@/lib/booking-request";
import { isClassDate } from "@/lib/availability/timetable";
import { notifyClassBookings } from "@/lib/class-checkout";
import { publishedClasses } from "@/lib/class-sessions";
import { coachDb, isUuid } from "@/lib/coach/db";
import { londonToday, londonToUtc } from "@/lib/coach/time";
import { emailError, singleLine } from "@/lib/form-validation";
import {
  ACCOUNT_PATH,
  bookWithClassCredit,
  bookWithCredit,
  cancelPaidPlace,
  cancelPlace,
  createLoginLink,
  isToken,
  LEGACY_COOKIE_PATH,
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
 * Sends a one-time sign-in link to a customer's email (a member, or anyone
 * who has paid for a class: migration 20261030000000). The visitor sees the
 * same message whether or not the address has an account (so the form can't
 * be used to find out who does), and nothing says whether an email went.
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
  period_unpaid: "period_unpaid",
  not_found: "not_found",
  not_booked: "not_found",
  not_credit_place: "not_found",
  credit_invalid: "credit_invalid",
};

const errorFor = (result: { ok: false; error: { kind: string; rule?: string | null } }) =>
  result.error.kind === "rule" ? (RULES[result.error.rule ?? ""] ?? "failed") : "failed";

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
  if (!result.ok) redirect(`${ACCOUNT_PATH}?error=${errorFor(result)}`);
  redirect(`${ACCOUNT_PATH}?done=booked`);
}

/**
 * Cancels one of the customer's own places. Late cancellations are confirmed
 * on the page first. A membership-credit place gets its credit back (24 hours
 * or more before); a paid place gets a class credit (same rule).
 */
export async function cancelClass(formData: FormData): Promise<void> {
  const member = await requireMember();
  const id = text(formData, "place");
  if (!isUuid(id)) redirect(`${ACCOUNT_PATH}?error=not_found`);
  if (text(formData, "paid") === "yes") {
    const result = await cancelPaidPlace(member.db, member.clientId, id);
    if (!result.ok) redirect(`${ACCOUNT_PATH}?error=${errorFor(result)}`);
    redirect(`${ACCOUNT_PATH}?done=${result.data ? "cancelled_credit" : "cancelled_paid_late"}`);
  }
  const result = await cancelPlace(member.db, member.clientId, id);
  if (!result.ok) redirect(`${ACCOUNT_PATH}?error=${errorFor(result)}`);
  redirect(`${ACCOUNT_PATH}?done=${result.data ? "cancelled_late" : "cancelled"}`);
}

/**
 * Books a class with one of the customer's class credits. As with credits,
 * the class's start time comes from the published timetable; the form only
 * says which class, which date and which credit.
 */
export async function bookClassWithCredit(formData: FormData): Promise<void> {
  const member = await requireMember();
  const slot = publishedClasses().find((c) => c.id === text(formData, "slot"));
  const date = text(formData, "date");
  const credit = text(formData, "credit");
  if (!slot || !isClassDate(date, slot, londonToday()) || !isUuid(credit)) redirect(`${ACCOUNT_PATH}?error=not_found`);
  const result = await bookWithClassCredit(member.db, {
    clientId: member.clientId,
    creditId: credit,
    slot: slot.id,
    date,
    startsAt: londonToUtc(date, slot.start),
    durationMinutes: slot.durationMinutes ?? 60,
    // One booking per credit: pressing twice books once.
    idempotencyKey: `account-credit/${credit}`,
  });
  if (!result.ok) redirect(`${ACCOUNT_PATH}?error=${errorFor(result)}`);
  // Confirmed at once: email the customer and Alex now rather than at the next reconcile (best effort).
  await notifyClassBookings(member.db, publishedClasses()).catch(() => 0);
  redirect(`${ACCOUNT_PATH}?done=booked_class_credit`);
}

/** Signs this browser out, or every device (everywhere=yes). */
export async function signOutMember(formData: FormData): Promise<void> {
  const member = await requireMember();
  await signOut(member.db, member.sessionHash, text(formData, "everywhere") === "yes");
  const jar = await cookies();
  jar.delete({ name: MEMBER_SESSION_COOKIE, path: "/" });
  jar.delete({ name: MEMBER_SESSION_COOKIE, path: LEGACY_COOKIE_PATH });
  redirect(`${SIGN_IN_PATH}?signed=out`);
}
