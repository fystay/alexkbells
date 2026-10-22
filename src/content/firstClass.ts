import type { ContentStatus } from "./types";

/**
 * "Your first class": reassurance for beginners. Empty on purpose; nothing
 * here has been confirmed by Alex. Fill in his own words and set the status
 * to "confirmed" and the section appears on the home page. Never published
 * unconfirmed.
 */
export interface FirstClass {
  status: ContentStatus;
  title: string;
  /** Short points, about eight words each (e.g. what to wear, what to bring). */
  points: string[];
}

export const firstClass: FirstClass | null = null;
