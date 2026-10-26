/**
 * Homepage copy that Alex may want to refine. Plain text, no markup: edit the
 * words here and nothing else needs to change. Keep it short.
 */
export const hero = {
  // What Alex does and where, in two lines (owner's pick A, 2026-10-26; was "Train with purpose. / Build with discipline.").
  headline: "Get stronger.",
  headlineSecondary: "Kettlebell classes in Cumbernauld",
  primaryLabel: "Book now",
  secondaryLabel: "Explore coaching",
} as const;

/** Practical benefits of kettlebell training, described, not promised. No medical or results claims. */
export const whyKettlebells = [
  { title: "Strength", body: "Train the whole body at once." },
  { title: "Conditioning", body: "Fitness and stamina, built in." },
  { title: "Movement quality", body: "Balance, timing and coordination." },
  { title: "Efficient and adaptable", body: "One bit of kit, trained anywhere." },
] as const;

/**
 * "Start in three steps." on the home page's classes section (option 1 of the card
 * overhaul, owner 2026-10-26). The step lines restate the confirmed FAQ
 * answers (content/faq.ts) more tightly; each shows only while its FAQ
 * answer is confirmed. Keep them in step with faq.ts.
 */
export const firstClassSteps = {
  title: "Start in three steps.",
  pick: "Pick a class",
  book: "Book your place",
  turnUp: "Turn up and train",
  // Step 3 says Alex teaches the key movements, so this stays short (fewer repeats, owner 2026-10-26).
  beginners: "New? Say so when you book.",
  firstSession: "Alex asks about your goals and any injuries, teaches the key movements and gets your technique solid before you go heavier.",
  bring: "Bring comfortable clothes, water and a small towel. Kettlebells provided. Flat shoes or bare feet work best.",
} as const;
