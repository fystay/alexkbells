"use server";

import { redirect } from "next/navigation";
import { text } from "@/lib/booking-request";
import { coachDb, isUuid } from "@/lib/coach/db";
import { memberLinkOrigin } from "@/lib/member-auth";
import { signupMember } from "@/lib/membership-checkout";
import { stripeConfig } from "@/lib/stripe/config";
import { startDirectDebitSetup } from "@/lib/stripe/direct-debit";

/**
 * "Set up your Direct Debit" on the page after a member's first payment:
 * opens Stripe's Direct Debit page for them (their bank details go to Stripe,
 * never to this site) and brings them back here. The sign-up id in the form
 * is only a pointer: the member, their email and the amounts all come from the
 * database, and only an active (paid) sign-up can open it.
 */
export async function startSignupDirectDebit(formData: FormData): Promise<void> {
  const id = text(formData, "signup");
  const back = isUuid(id) ? `/memberships/join/done?signup=${id}` : "/memberships";
  const db = coachDb();
  const stripe = stripeConfig();
  if (!isUuid(id) || !db || !stripe) redirect(`${back}${back.includes("?") ? "&" : "?"}dd=unavailable`);
  const member = await signupMember(db, id);
  if (!member) redirect(`${back}&dd=unavailable`);
  const result = await startDirectDebitSetup(db, stripe, member, `${memberLinkOrigin()}${back}`);
  if (!result.ok) redirect(`${back}&dd=${result.reason === "already_set_up" ? "done" : "unavailable"}`);
  redirect(result.url);
}
