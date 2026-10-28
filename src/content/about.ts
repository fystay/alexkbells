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

/**
 * The three brand themes. Creative direction supplied in the RAENG brief;
 * wording as in the owner's /about design (2026-10-28).
 */
export const pillars = [
  {
    title: "Strength",
    body: "Built progressively, with good technique, so it lasts. Kettlebells are the main tool: simple, demanding and effective for the whole body.",
  },
  {
    title: "Community",
    body: "People train alongside each other, each at their own level. The group keeps you going on the days you'd rather skip.",
  },
  {
    title: "Discipline",
    body: "Show up and do the work, session after session. Consistency over time, not one week of intensity.",
  },
] as const;

/**
 * "Our philosophy": แรง set like a dictionary entry, then "More than
 * strength." (owner's /about design, 2026-10-28; replaces the card wording of
 * 2026-10-27). The four senses are the ones on RAENG's philosophy card
 * (strength, power, energy, drive); tapping one shows its line.
 */
export const philosophy = {
  status: "confirmed" as ContentStatus,
  eyebrow: "Our philosophy",
  thai: "แรง",
  pronunciation: "raeng",
  partOfSpeech: "Thai, noun",
  senses: [
    { word: "strength", line: "The kind you build with good technique, so it lasts." },
    { word: "power", line: "Force you can produce fast, like a clean swing." },
    { word: "energy", line: "What you bring into the room, and take home with you." },
    { word: "drive", line: "The reason you still turn up on the hard days." },
  ],
  title: "More than strength.",
  paragraphs: [
    "To us it is a mindset as much as a physical quality. Real strength comes from discipline, consistency and continuing to show up. Kettlebells are the tool. The aim is stronger people, a stronger community and a stronger version of yourself, in and out of the gym.",
  ],
};
