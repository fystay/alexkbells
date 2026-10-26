import type { ContentStatus } from "./types";

/**
 * Longer-form brand story for /about, in Alex's own words: his RAENG launch
 * post on Instagram (@alex.kbells, 26 Oct 2026), published by him, so
 * confirmed. Left out: the opening teaser line and the paragraph promising
 * news "over the next few weeks" (it would date), and the closing emoji.
 */
export const aboutStory: { status: ContentStatus; title: string; paragraphs: string[] } | null = {
  status: "confirmed",
  title: "Introducing RAENG Fitness.",
  paragraphs: [
    "Kettlebell training has become a big part of my life, and over time it’s grown into something I want to build beyond myself.",
    "A place where people can challenge themselves, learn new skills, build confidence and be part of something bigger than just a workout.",
    "I want to bring people together through training, create an environment where everyone can progress at their own pace, and help people enjoy the process of getting stronger, both inside and outside the gym.",
    "The next chapter starts here. Welcome to RAENG.",
  ],
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
