/**
 * Homepage copy that Alex may want to refine. Plain text, no markup: edit the
 * words here and nothing else needs to change. Keep it short.
 */
export const hero = {
  headline: "Train with purpose.",
  headlineSecondary: "Build with discipline.",
  primaryLabel: "Book now",
  secondaryLabel: "Explore coaching",
} as const;

/** Practical benefits of kettlebell training, described, not promised. No medical or results claims. */
export const whyKettlebells = [
  { title: "Strength", body: "Train the whole body at once.", image: "whyStrength" },
  { title: "Conditioning", body: "Strength and fitness, together.", image: "whyConditioning" },
  { title: "Movement quality", body: "Balance, timing and coordination.", image: "whyMovement" },
  { title: "Efficient and adaptable", body: "One bit of kit, scaled to you.", image: "whyAdaptable" },
] as const;
