import { groupClass } from "@/content/classes";
import { formatAddressLines, site } from "@/content/site";
import { publishedClasses } from "@/lib/class-sessions";
import { rpc, type Db, type DbResult } from "./coach/db";
import { ACCOUNT_PATH, memberLinkOrigin } from "./member-auth";
import type { Env } from "./env";

/**
 * The account menu's settings (owner, 2026-10-28; migration
 * 20261031000000_akb_member_settings.sql): profile, devices, the private
 * calendar link and class reminders. Server only: these call the member
 * functions with the secret key, passing the signed-in client's id.
 */

export const PROFILE_PATH = "/account/profile";
export const SECURITY_PATH = "/account/security";
export const CALENDAR_SYNC_PATH = "/account/calendar-sync";
export const NOTIFICATIONS_PATH = "/account/notifications";
export const CALENDAR_FEED_PATH = "/account/calendar/feed";

export interface MemberSettings {
  name: string;
  email: string;
  phone: string;
  class_reminders: boolean;
  calendar_feed: boolean;
}

export interface MemberDevice {
  id: string;
  device: string;
  signed_in_at: string;
  last_seen_at: string;
  current: boolean;
}

export const memberSettings = (db: Db, clientId: string) => rpc<MemberSettings>(db, "akb_member_settings_get", { p_client: clientId });

export const updateProfile = (db: Db, clientId: string, name: string, phone: string) =>
  rpc<null>(db, "akb_member_update_profile", { p_client: clientId, p_name: name, p_phone: phone });

export const setReminders = (db: Db, clientId: string, on: boolean) => rpc<null>(db, "akb_member_set_reminders", { p_client: clientId, p_on: on });

export const labelSession = (db: Db, sessionHash: string, device: string) => rpc<null>(db, "akb_member_label_session", { p_session_hash: sessionHash, p_device: device });

export const memberDevices = (db: Db, clientId: string, currentHash: string) =>
  rpc<MemberDevice[]>(db, "akb_member_sessions_list", { p_client: clientId, p_current_hash: currentHash });

export const endOtherSession = (db: Db, clientId: string, sessionId: string, currentHash: string): Promise<DbResult<boolean>> =>
  rpc<boolean>(db, "akb_member_end_other_session", { p_client: clientId, p_session: sessionId, p_current_hash: currentHash });

export const setCalendarFeed = (db: Db, clientId: string, tokenHash: string) => rpc<null>(db, "akb_member_calendar_set", { p_client: clientId, p_token_hash: tokenHash });
export const turnOffCalendarFeed = (db: Db, clientId: string) => rpc<null>(db, "akb_member_calendar_off", { p_client: clientId });
export const calendarFeedClient = (db: Db, tokenHash: string) => rpc<string | null>(db, "akb_member_calendar_client", { p_token_hash: tokenHash });

// ---------------------------------------------------------------------------
// Devices
// ---------------------------------------------------------------------------

/**
 * A short label from the browser's own description, so a member can tell their
 * phone from their laptop. Only the device and browser family are kept; the
 * user agent itself is never stored.
 */
export function deviceLabel(userAgent: string | null | undefined): string {
  const ua = userAgent ?? "";
  const os = /iPhone/.test(ua) ? "iPhone" : /iPad/.test(ua) ? "iPad" : /Android/.test(ua) ? "Android" : /Macintosh|Mac OS X/.test(ua) ? "Mac" : /Windows/.test(ua) ? "Windows" : /CrOS/.test(ua) ? "Chromebook" : /Linux/.test(ua) ? "Linux" : "";
  const browser = /Edg(e|A|iOS)?\//.test(ua) ? "Edge" : /OPR\/|Opera/.test(ua) ? "Opera" : /Firefox\/|FxiOS\//.test(ua) ? "Firefox" : /Chrome\/|CriOS\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "";
  return [os, browser].filter(Boolean).join(", ");
}

// ---------------------------------------------------------------------------
// Calendar link
// ---------------------------------------------------------------------------

/** The private link: the site's own address (never the Host header), then the token. */
export function calendarFeedUrl(token: string, env: Env = process.env): string {
  return `${memberLinkOrigin(env)}${CALENDAR_FEED_PATH}/${token}.ics`;
}

/** The same link for calendar apps that subscribe through the webcal scheme. */
export function webcalUrl(httpsUrl: string): string {
  return httpsUrl.replace(/^https?:/, "webcal:");
}

/** The token in /account/calendar/feed/<token>.ics (the ".ics" is optional). */
export function feedToken(segment: string): string {
  return segment.replace(/\.ics$/i, "");
}

// ---------------------------------------------------------------------------
// Class reminders
// ---------------------------------------------------------------------------

export interface DueReminder {
  attendance_id: string;
  name: string;
  email: string;
  starts_at: string;
  slot: string;
}

export const dueReminders = (db: Db, date: string) => rpc<DueReminder[]>(db, "akb_class_reminders_due", { p_date: date });
export const reminderSent = (db: Db, attendanceId: string) => rpc<null>(db, "akb_class_reminder_sent", { p_attendance: attendanceId });

const londonTime = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", hour: "2-digit", minute: "2-digit", hour12: false });

/** The reminder email. Plain text: the class, where, and how to see or stop reminders. */
export function reminderEmail(r: DueReminder, env: Env = process.env): { subject: string; text: string } {
  const time = londonTime.format(new Date(r.starts_at));
  const slot = publishedClasses().find((c) => c.id === r.slot);
  const first = r.name.trim().split(/\s+/)[0] || "there";
  const origin = memberLinkOrigin(env);
  return {
    subject: `Reminder: ${groupClass.name} today at ${time}`,
    text: [
      `Hi ${first},`,
      "",
      `A reminder that you're booked on ${groupClass.name} today at ${time}${slot?.durationMinutes ? ` (${slot.durationMinutes} minutes)` : ""}.`,
      "",
      `${site.name}, ${formatAddressLines().join(", ")}`,
      "",
      `Your bookings: ${origin}${ACCOUNT_PATH}`,
      `Turn these reminders off any time: ${origin}${NOTIFICATIONS_PATH}`,
    ].join("\n"),
  };
}
