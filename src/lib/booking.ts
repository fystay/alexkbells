/**
 * Booking integration boundary. The primary call to action is
 * "Book your class", pointing at (in order of preference):
 * 1. An external booking page (BOOKING_URL), e.g. Setmore or Square.
 * 2. The site's own /book request form, once email delivery is configured.
 * 3. Otherwise an honest "Enquire about classes" → /contact. Never a contact
 *    page dressed up as booking, and never a fake booking flow.
 */

import type { Env } from "./env";
import { isBookingFormEnabled } from "./booking-request";

export interface CallToAction {
  kind: "booking" | "enquiry";
  label: string;
  href: string;
  external: boolean;
}

export const ENQUIRY_HREF = "/contact";
export const BOOK_PAGE_HREF = "/book";
export const BOOK_LABEL = "Book your class";

/** Build-time check: a production site without a working booking link cannot take bookings. */
export function bookingConfigWarning(env: Env = process.env): string | null {
  if (env.VERCEL_ENV !== "production") return null;
  if (env.BOOKING_URL && !parseBookingUrl(env.BOOKING_URL)) {
    return "BOOKING_URL is not a valid https URL, so it is ignored.";
  }
  if (parseBookingUrl(env.BOOKING_URL) || isBookingFormEnabled(env)) return null;
  return "No booking route is configured: \"Book your class\" buttons fall back to \"Enquire about classes\". Configure the /book form (RESEND_API_KEY, BOOKING_NOTIFY_EMAIL, BOOKING_FROM_EMAIL) or set BOOKING_URL — see DEPLOYMENT.md.";
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
  if (isBookingFormEnabled(env)) {
    return { kind: "booking", label: BOOK_LABEL, href: BOOK_PAGE_HREF, external: false };
  }
  return { kind: "enquiry", label: "Enquire about classes", href: ENQUIRY_HREF, external: false };
}

export function getCoachingEnquiryAction(): CallToAction {
  return { kind: "enquiry", label: "Enquire about coaching", href: ENQUIRY_HREF, external: false };
}
