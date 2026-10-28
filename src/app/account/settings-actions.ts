"use server";

import { redirect } from "next/navigation";
import { text } from "@/lib/booking-request";
import { isUuid } from "@/lib/coach/db";
import { nameError, phoneError, singleLine } from "@/lib/form-validation";
import { randomToken, sha256Hex } from "@/lib/member-auth";
import { requireMember } from "@/lib/member-session";
import {
  CALENDAR_SYNC_PATH,
  calendarFeedUrl,
  endOtherSession,
  NOTIFICATIONS_PATH,
  PROFILE_PATH,
  SECURITY_PATH,
  setCalendarFeed,
  setReminders,
  turnOffCalendarFeed,
  updateProfile,
} from "@/lib/member-settings";

/** Saves the member's own name and phone. The email changes only through Alex. */
export async function saveProfile(formData: FormData): Promise<void> {
  const member = await requireMember();
  const name = singleLine(text(formData, "name"));
  const phone = singleLine(text(formData, "phone"));
  if (nameError(name)) redirect(`${PROFILE_PATH}?error=invalid_name`);
  if (phoneError(phone)) redirect(`${PROFILE_PATH}?error=invalid_phone`);
  const result = await updateProfile(member.db, member.clientId, name, phone);
  if (!result.ok) {
    const rule = result.error.kind === "rule" ? result.error.rule : null;
    redirect(`${PROFILE_PATH}?error=${rule === "invalid_name" || rule === "invalid_phone" ? rule : "failed"}`);
  }
  redirect(`${PROFILE_PATH}?done=profile_saved`);
}

/** Switches class reminder emails on or off (off until they choose). */
export async function saveReminders(formData: FormData): Promise<void> {
  const member = await requireMember();
  const on = text(formData, "reminders") === "on";
  const result = await setReminders(member.db, member.clientId, on);
  if (!result.ok) redirect(`${NOTIFICATIONS_PATH}?error=failed`);
  redirect(`${NOTIFICATIONS_PATH}?done=${on ? "reminders_on" : "reminders_off"}`);
}

/** Signs out one of the member's other devices (never the one they're using: that is "Sign out"). */
export async function signOutDevice(formData: FormData): Promise<void> {
  const member = await requireMember();
  const id = text(formData, "device");
  if (!isUuid(id)) redirect(`${SECURITY_PATH}?error=device_gone`);
  const result = await endOtherSession(member.db, member.clientId, id, member.sessionHash);
  if (!result.ok) redirect(`${SECURITY_PATH}?error=failed`);
  redirect(`${SECURITY_PATH}?${result.data ? "done=device_out" : "error=device_gone"}`);
}

export interface CalendarLinkState {
  status: "idle" | "ready" | "error";
  /** The private link: shown once, only its hash is kept. */
  url: string;
  message: string;
}

/**
 * Makes the member's private calendar link (replacing any earlier one, which
 * stops working). The link is returned to the page once; the database keeps
 * only its SHA-256 hash, as it does for sign-in links.
 */
export async function createCalendarLink(): Promise<CalendarLinkState> {
  const member = await requireMember();
  const token = randomToken();
  const result = await setCalendarFeed(member.db, member.clientId, await sha256Hex(token));
  if (!result.ok) return { status: "error", url: "", message: "Sorry, we couldn't make the link. Please try again." };
  return { status: "ready", url: calendarFeedUrl(token), message: "" };
}

/** Turns the calendar link off: calendars still using it stop getting classes. */
export async function turnOffCalendarLink(): Promise<void> {
  const member = await requireMember();
  const result = await turnOffCalendarFeed(member.db, member.clientId);
  if (!result.ok) redirect(`${CALENDAR_SYNC_PATH}?error=failed`);
  redirect(`${CALENDAR_SYNC_PATH}?done=calendar_off`);
}
