import type { Journey } from "./types";

/**
 * Alex's journey: homepage section with his story and before/after photos.
 *
 * HOW TO FILL THIS IN
 * 1. Replace every [bracketed] text below with Alex's own words.
 * 2. Put his photos in public/journey/ (e.g. before.jpg, after.jpg: portrait,
 *    ideally 4:5, at least 1000 px wide) and fill in `before` / `after`, e.g.
 *      before: { src: "/journey/before.jpg", width: 1200, height: 1500, alt: "Alex in 2019, before he started kettlebell training" },
 *    `alt` describes the photo for people who can't see it.
 * 3. Optional: add real numbers to `highlights`, e.g.
 *      { value: "25k", label: "Instagram followers" }
 *    Only figures that are true today; leave the list empty otherwise.
 * 4. When Alex has approved the words and photos, change `status` to
 *    "confirmed". Until then the section is hidden on the live site and only
 *    shown, with an "awaiting confirmation" frame, on previews where
 *    CONTENT_PREVIEW=true.
 */
export const journey: Journey = {
  status: "provisional",
  title: "[Short headline, e.g. from where he started to coach]",
  intro:
    "[Two or three sentences in Alex's voice: why he started training, what changed, and why he now coaches others.]",
  chapters: [
    {
      label: "Where it started",
      title: "[Chapter title]",
      body: "[What training and life looked like at the start.]",
    },
    {
      label: "Finding kettlebells",
      title: "[Chapter title]",
      body: "[The turning point and what kettlebell training changed.]",
    },
    {
      label: "Coaching today",
      title: "[Chapter title]",
      body: "[How that experience shapes the way Alex coaches his clients now.]",
    },
  ],
  before: null,
  after: null,
  beforeLabel: "Before",
  afterLabel: "After",
  caption: "[Caption for the photos, e.g. the years they were taken.]",
  highlights: [],
};
