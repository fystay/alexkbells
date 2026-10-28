"use server";

import { redirect } from "next/navigation";
import { text } from "@/lib/booking-request";
import {
  COACHING_CHECK_IN_PATH,
  COACHING_MESSAGES_PATH,
  COACHING_PATH,
  coachingOverview,
  logSession,
  sendCoachingMessage,
  submitCheckIn,
} from "@/lib/coaching";
import { itemsOf } from "@/lib/coaching";
import { sessionSets } from "@/lib/coaching-form";
import { requireMember } from "@/lib/member-session";

const ruleOf = (r: { ok: false; error: { kind: string; rule?: string | null } }) => (r.error.kind === "rule" ? (r.error.rule ?? "failed") : "failed");

/**
 * Logs a session. The exercises and the number of sets come from the
 * programme the server reads, never from the form; the week is today's week.
 */
export async function finishSession(formData: FormData): Promise<void> {
  const member = await requireMember();
  const overview = await coachingOverview(member.db, member.clientId);
  if (!overview.ok || !overview.data.active || !overview.data.programme) redirect(`${COACHING_PATH}?error=no_programme`);
  const programme = overview.data.programme;
  const day = text(formData, "day");
  const items = itemsOf(programme, programme.week, day);
  if (items.length === 0) redirect(`${COACHING_PATH}?error=failed`);
  const result = await logSession(member.db, member.clientId, programme.week, day, text(formData, "note").slice(0, 500), sessionSets(formData, items));
  if (!result.ok) redirect(`${COACHING_PATH}?day=${encodeURIComponent(day)}&error=failed`);
  redirect(`${COACHING_PATH}?day=${encodeURIComponent(day)}&done=session_logged`);
}

const score = (formData: FormData, name: string) => {
  const n = Number(text(formData, name));
  return Number.isInteger(n) ? n : 0;
};

/** This week's check-in: three scores, two notes and an optional link to a form video. */
export async function sendCheckIn(formData: FormData): Promise<void> {
  const member = await requireMember();
  const input = {
    energy: score(formData, "energy"),
    sleep: score(formData, "sleep"),
    training: score(formData, "training"),
    wins: text(formData, "wins").slice(0, 1000),
    struggles: text(formData, "struggles").slice(0, 1000),
    video: text(formData, "video").slice(0, 500),
  };
  if (![input.energy, input.sleep, input.training].every((n) => n >= 1 && n <= 5)) redirect(`${COACHING_CHECK_IN_PATH}?error=check_in_scores`);
  const result = await submitCheckIn(member.db, member.clientId, input);
  if (!result.ok) {
    const rule = ruleOf(result);
    redirect(`${COACHING_CHECK_IN_PATH}?error=${rule === "invalid_video" ? "check_in_video" : rule === "already_sent" ? "check_in_already" : "failed"}`);
  }
  redirect(`${COACHING_CHECK_IN_PATH}?done=check_in_sent`);
}

/** A message to Alex. */
export async function sendMessage(formData: FormData): Promise<void> {
  const member = await requireMember();
  const result = await sendCoachingMessage(member.db, member.clientId, text(formData, "body").slice(0, 2000));
  if (!result.ok) {
    const rule = ruleOf(result);
    redirect(`${COACHING_MESSAGES_PATH}?error=${rule === "invalid_message" ? "message_invalid" : rule === "too_many" ? "message_too_many" : "failed"}`);
  }
  redirect(COACHING_MESSAGES_PATH);
}
