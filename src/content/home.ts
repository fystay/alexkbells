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
// `how`: the line shown when a section of the kettlebell is tapped, as the
// owner supplied it with the kettlebell design (2026-10-28).
export const whyKettlebells = [
  { title: "Strength", body: "Train the whole body at once.", how: "Swings, cleans and presses load legs, back and shoulders together." },
  { title: "Conditioning", body: "Fitness and stamina, built in.", how: "Intervals and complexes keep your heart rate up without a treadmill." },
  { title: "Movement quality", body: "Balance, timing and coordination.", how: "Get-ups and flows build control through every position." },
  { title: "Efficient and adaptable", body: "One bit of kit, trained anywhere.", how: "One bell and two square metres of floor is a full session." },
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
