import { fullClasses } from "@/lib/class-capacity";
import { londonToday } from "@/lib/coach/time";
import { memberOverview } from "@/lib/member-auth";
import { requireMember } from "@/lib/member-session";
import { paymentDue } from "@/lib/membership-checkout";
import { squareConfig } from "@/lib/square/config";

/** After an action: what happened (?done=). Shown as a toast. */
export const DONE: Record<string, string> = {
  booked: "Booked. One credit used.",
  cancelled: "Cancelled. Your credit is back.",
  cancelled_late: "Cancelled. It was less than 24 hours before the class, so the credit is used.",
  cancelled_credit: "Cancelled. You have a class credit for another class within 4 weeks.",
  cancelled_paid_late: "Cancelled. It was less than 24 hours before the class, so there's nothing back.",
  booked_class_credit: "Booked with your class credit. Nothing to pay.",
};

/** Why an action couldn't happen (?error=). Shown as an alert at the top. */
export const ERRORS: Record<string, string> = {
  class_full: "Sorry, that class is full.",
  class_cancelled: "That class has been cancelled.",
  no_credits: "You've no credits left this period.",
  already_booked: "You're already booked on that class.",
  class_started: "That class has already started.",
  outside_period: "Credits can only be used in the period they belong to. That date is in your next period.",
  period_unpaid: "Please pay for this period first. Its credits work as soon as Square confirms.",
  not_found: "That class couldn't be found. Please try again.",
  credit_invalid: "That class credit can't be used for that class. It may have been used, or the class is after it runs out.",
  failed: "Sorry, something went wrong. Please try again, or message Alex.",
};

type Params = Record<string, string | string[] | undefined>;

/**
 * What every members page needs: the signed-in member (or the sign-in page),
 * their overview, which classes are full or cancelled, any payment due, and
 * the status of the last action.
 */
export async function loadMembers(searchParams: Promise<Params>) {
  const member = await requireMember();
  const params = await searchParams;
  const now = new Date();
  const today = londonToday(now);
  const [overview, full, due] = await Promise.all([
    memberOverview(member.db, member.clientId),
    fullClasses(today),
    // Members who pay online: this period's payment, if it's still to pay (credits wait for it).
    paymentDue(member.db, squareConfig(), member.clientId),
  ]);
  const one = (k: string) => (typeof params[k] === "string" ? (params[k] as string) : null);
  const done = one("done") ? (DONE[one("done")!] ?? null) : null;
  const error = one("error") ? (ERRORS[one("error")!] ?? ERRORS.failed) : null;
  return { member, now, today, overview, full, due, done, error, justBooked: done ? one("at") : null, confirm: one("confirm") };
}
