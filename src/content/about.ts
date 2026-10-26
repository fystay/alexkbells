import type { ContentStatus } from "./types";

/**
 * Alex's line on what RAENG is for, word for word from his launch post on
 * Instagram (@alex.kbells, 26 Oct 2026), published by him, so confirmed.
 * Shown on /about as a quote with the class facts and Book now (owner's
 * pick C, 2026-10-26: the full post read too casual to sell).
 */
export const aboutQuote: { status: ContentStatus; text: string } | null = {
  status: "confirmed",
  text: "Be part of something bigger than just a workout.",
};

/** The three brand themes. Creative direction supplied in the RAENG brief. */
export const pillars = [
  {
    title: "Strength",
    body: "Built progressively and with good technique, so it lasts. Kettlebells are the main tool: simple, demanding and effective for the whole body.",
  },
  {
    title: "Community",
    body: "People training alongside each other, each at their own level. The room carries you on the days you'd rather skip.",
  },
  {
    title: "Discipline",
    body: "Showing up and doing the work, session after session. Not intensity for a week, but consistency over time.",
  },
] as const;
