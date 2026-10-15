/**
 * Booking integration boundary. Pages ask for a `CallToAction` and a mode;
 * they never know the provider.
 *
 * Booking modes, in order of preference:
 * 1. "external": a real booking page (BOOKING_URL), e.g. Setmore or Square.
 * 2. "demo": the guided booking interface with labelled demonstration
 *    availability, for showing Alex. Never on Vercel production, never sends
 *    or books anything.
 * 3. "request": the guided interface without a calendar: visitors choose a
 *    confirmed class time or their preferred days, and the request is
 *    emailed to Alex, who confirms by reply.
 * 4. "unavailable": honest "Enquire" buttons → /contact. Never a contact page
 *    dressed up as booking, and never a fake booking flow.
 */

import { isProductionDeployment, type Env } from "./env";
import { isBookingFormEnabled } from "./booking-request";
import type { BookableService } from "./booking-options";

export interface CallToAction {
  kind: "booking" | "enquiry";
  label: string;
  href: string;
  external: boolean;
}

export type BookingMode = "external" | "demo" | "request" | "unavailable";
export type EnquiryMode = "send" | "demo" | "unavailable";

export const ENQUIRY_HREF = "/contact";
export const BOOK_PAGE_HREF = "/book";
export const ONLINE_COACHING_HREF = "/online-coaching";
/** Short label for the header, where space is tight at tablet widths. */
export const BOOK_SHORT_LABEL = "Book a session";

const LABELS: Record<BookableService | "any", string> = {
  any: "Book your session",
  "group-class": "Book your class",
  "one-to-one": "Book a one-to-one",
};

const PATHS: Record<BookableService | "any", string> = {
  any: BOOK_PAGE_HREF,
  "group-class": "/book/group-class",
  "one-to-one": "/book/one-to-one",
};

/** Demonstration availability: opt-in, and impossible on Vercel production. */
export function isBookingDemoEnabled(env: Env = process.env): boolean {
  return env.BOOKING_DEMO === "true" && !isProductionDeployment(env);
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

export function bookingMode(env: Env = process.env): BookingMode {
  if (parseBookingUrl(env.BOOKING_URL)) return "external";
  if (isBookingDemoEnabled(env)) return "demo";
  if (isBookingFormEnabled(env)) return "request";
  return "unavailable";
}

/** Online coaching never uses availability, so a real send always wins over demo. */
export function onlineEnquiryMode(env: Env = process.env): EnquiryMode {
  if (isBookingFormEnabled(env)) return "send";
  if (isBookingDemoEnabled(env)) return "demo";
  return "unavailable";
}

/** Build-time check: a production site without a working booking route cannot take bookings. */
export function bookingConfigWarning(env: Env = process.env): string | null {
  if (env.VERCEL_ENV !== "production") return null;
  if (env.BOOKING_URL && !parseBookingUrl(env.BOOKING_URL)) {
    return "BOOKING_URL is not a valid https URL, so it is ignored.";
  }
  if (bookingMode(env) !== "unavailable") return null;
  return "No booking route is configured: \"Book\" buttons fall back to \"Enquire\". Configure the /book request form (RESEND_API_KEY, BOOKING_NOTIFY_EMAIL, BOOKING_FROM_EMAIL) or set BOOKING_URL — see DEPLOYMENT.md. (BOOKING_DEMO is ignored on production.)";
}

/** The primary "Book" button for a service, or for booking in general. */
export function getBookingAction(service: BookableService | "any" = "any", env: Env = process.env): CallToAction {
  const mode = bookingMode(env);
  if (mode === "external") {
    return { kind: "booking", label: LABELS[service], href: parseBookingUrl(env.BOOKING_URL)!.toString(), external: true };
  }
  if (mode === "demo" || mode === "request") {
    return { kind: "booking", label: LABELS[service], href: PATHS[service], external: false };
  }
  return service === "group-class"
    ? { kind: "enquiry", label: "Enquire about classes", href: ENQUIRY_HREF, external: false }
    : { kind: "enquiry", label: "Get in touch", href: ENQUIRY_HREF, external: false };
}

export function getClassBookingAction(env: Env = process.env): CallToAction {
  return getBookingAction("group-class", env);
}

export function getOnlineCoachingAction(env: Env = process.env): CallToAction {
  return onlineEnquiryMode(env) === "unavailable"
    ? { kind: "enquiry", label: "Enquire about coaching", href: ENQUIRY_HREF, external: false }
    : { kind: "enquiry", label: "Explore online coaching", href: ONLINE_COACHING_HREF, external: false };
}

export function getCoachingEnquiryAction(): CallToAction {
  return { kind: "enquiry", label: "Enquire about coaching", href: ENQUIRY_HREF, external: false };
}
