/**
 * Homepage copy that Alex may want to refine. Plain text, no markup: edit the
 * words here and nothing else needs to change. Keep it short.
 */
export const hero = {
  headline: "Train with purpose.",
  headlineSecondary: "Build with discipline.",
  /** Under the headline (warm tech hero, owner's pick C, 2026-10-26): the three ways to train, no claims. */
  summary: "Coached classes, 1:1 and online coaching.",
  primaryLabel: "Book now",
  secondaryLabel: "Explore coaching",
} as const;

/** Practical benefits of kettlebell training, described, not promised. No medical or results claims. */
export const whyKettlebells = [
  { title: "Strength", body: "Train the whole body at once." },
  { title: "Conditioning", body: "Strength and fitness, together." },
  { title: "Movement quality", body: "Balance, timing and coordination." },
  { title: "Efficient and adaptable", body: "One bit of kit, scaled to you." },
] as const;
