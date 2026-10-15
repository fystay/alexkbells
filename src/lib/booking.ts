/**
 * Booking integration boundary.
 *
 * The primary call to action is "Book your class", linking straight to
 * Alex's external booking page (whichever provider he confirms) set via
 * BOOKING_URL. Without a valid https URL the button honestly falls back to
 * an enquiry — never a contact page dressed up as booking, and never a fake
 * booking flow. Swapping in a different provider later only changes this
 * module, not the pages.
 */

import type { Env } from "./env";

export interface CallToAction {
  kind: "booking" | "enquiry";
  label: string;
  href: string;
  external: boolean;
}

export const ENQUIRY_HREF = "/contact";
export const BOOK_LABEL = "Book your class";

/** Build-time check: a production site without a working booking link cannot take bookings. */
export function bookingConfigWarning(env: Env = process.env): string | null {
  if (env.VERCEL_ENV !== "production") return null;
  if (!env.BOOKING_URL) {
    return "BOOKING_URL is not set: \"Book your class\" buttons fall back to \"Enquire about classes\". Set it to Alex's booking page (https) before launch.";
  }
  if (!parseBookingUrl(env.BOOKING_URL)) {
    return "BOOKING_URL is not a valid https URL, so it is ignored and buttons fall back to \"Enquire about classes\".";
  }
  return null;
}

export function parseBookingUrl(raw: string | undefined): URL | null {
  if (!raw) return null;
  try {
    const url = new URL(raw.trim());
    return url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

export function getClassBookingAction(
  env: Env = process.env,
): CallToAction {
  const url = parseBookingUrl(env.BOOKING_URL);
  if (url) {
    return { kind: "booking", label: BOOK_LABEL, href: url.toString(), external: true };
  }
  return { kind: "enquiry", label: "Enquire about classes", href: ENQUIRY_HREF, external: false };
}

export function getCoachingEnquiryAction(): CallToAction {
  return { kind: "enquiry", label: "Enquire about coaching", href: ENQUIRY_HREF, external: false };
}
