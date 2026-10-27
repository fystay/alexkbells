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

/**
 * "Our philosophy", word for word from RAENG's own philosophy card (supplied
 * by the owner, 2026-10-27). Opens /about.
 */
export const philosophy = {
  status: "confirmed" as ContentStatus,
  eyebrow: "Our philosophy",
  thai: "แรง",
  word: "RAENG",
  title: "More than strength.",
  paragraphs: [
    "In Thai, แรง (Raeng) represents strength, power, energy and drive. It’s more than just physical strength, it’s a mindset.",
    "RAENG is built on the belief that real strength comes from discipline, consistency and the willingness to keep showing up. Kettlebell training is the tool, but the purpose is bigger.",
    "To build stronger people, a stronger community and a stronger version of ourselves, inside and outside the gym.",
  ],
  values: "Strength • Community • Discipline",
};
