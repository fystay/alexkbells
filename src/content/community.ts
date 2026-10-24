import type { ContentStatus } from "./types";

/**
 * Member stories and testimonials. Empty on purpose: nothing has been
 * supplied, and none is ever invented. To add one, get written permission
 * from the person, then add an entry. An entry shows only when its status is
 * "confirmed". `attribution` is exactly how they agreed to be named
 * (e.g. "Member since 2026", or a first name); never a made-up detail.
 */
export interface Testimonial {
  status: ContentStatus;
  quote: string;
  attribution: string;
}

export const testimonials: Testimonial[] = [];
