import type { ContentStatus } from "./types";

/**
 * Longer-form brand story for /about. `story` is an empty slot: write it
 * with Alex (why RAENG exists, how it started, what the space is meant to
 * feel like), then set its status to "confirmed". Nothing is invented here.
 * Empty or provisional stories are not shown on production.
 */
export const aboutStory: { status: ContentStatus; title: string; paragraphs: string[] } | null = null;

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
