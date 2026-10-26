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
  { title: "Strength", body: "Train the whole body at once." },
  { title: "Conditioning", body: "Strength and fitness, together." },
  { title: "Movement quality", body: "Balance, timing and coordination." },
  { title: "Efficient and adaptable", body: "One bit of kit, scaled to you." },
] as const;

/**
 * "Your first class in three steps" under the timetable (option 1 of the card
 * overhaul, owner 2026-10-26). The step lines restate the confirmed FAQ
 * answers (content/faq.ts) more tightly; each shows only while its FAQ
 * answer is confirmed. Keep them in step with faq.ts.
 */
export const firstClassSteps = {
  intro: "Your first class in three steps.",
  pick: "Pick a class",
  book: "Book your place",
  turnUp: "Turn up and train",
  beginners: "New? Say so when you book and Alex will take you through the basics.",
  firstSession: "Alex asks about your goals and any injuries, teaches the key movements and gets your technique solid before you go heavier.",
  bring: "Bring comfortable clothes, water and a small towel. Kettlebells provided. Flat shoes or bare feet work best.",
} as const;
