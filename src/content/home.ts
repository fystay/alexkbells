/**
 * Homepage copy that Alex may want to refine. Plain text, no markup: edit the
 * words here and nothing else needs to change. Keep it short.
 */
export const hero = {
  headline: "Get stronger.",
  headlineSecondary: "Move better.",
  copy: "Kettlebell coaching in Cumbernauld. Build strength, fitness and movement quality in a group class, one to one or online.",
  primaryLabel: "Book a class",
  secondaryLabel: "Explore coaching",
} as const;

/** Practical benefits of kettlebell training, described, not promised. No medical or results claims. */
export const whyKettlebells = [
  { title: "Strength", body: "Swings, squats and presses train the whole body at once." },
  { title: "Conditioning", body: "Your heart rate climbs, so strength and fitness train together." },
  { title: "Movement quality", body: "Moving a weight through space builds balance, timing and coordination." },
  { title: "Efficient and adaptable", body: "One piece of kit, scaled to your level, in a class, at home or away." },
] as const;
