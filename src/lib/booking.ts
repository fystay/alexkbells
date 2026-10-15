/**
 * Booking integration boundary.
 *
 * Phase 1: the only supported provider is an external booking page
 * (e.g. Setmore or Square Appointments) configured via BOOKING_URL.
 * Without a valid URL, calls to action fall back to an enquiry, never a
 * fake booking flow. Phase 2 can swap this module for a real adapter
 * without touching page components.
 */

import type { Env } from "./env";

export interface CallToAction {
  kind: "booking" | "enquiry";
  label: string;
  href: string;
  external: boolean;
}

export const ENQUIRY_HREF = "/contact";

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
    return { kind: "booking", label: "Book a class", href: url.toString(), external: true };
  }
  return { kind: "enquiry", label: "Enquire about classes", href: ENQUIRY_HREF, external: false };
}

export function getCoachingEnquiryAction(): CallToAction {
  return { kind: "enquiry", label: "Enquire about coaching", href: ENQUIRY_HREF, external: false };
}
