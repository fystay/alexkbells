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
  // Written from Alex's own reel ("1% everyday") and Instagram bio, and
  // published at the project owner's request on 2026-10-15. Swap in Alex's
  // own words and chapters when he supplies them.
  status: "confirmed",
  title: "1% better, every day",
  intro:
    "Alex didn't start out as a coach. His own change came from turning up and getting 1% better every day. Now he helps others do the same: build strength, move better and improve their fitness, in classes, one-to-one and online.",
  chapters: [],
  // Both from Alex's reel; overlays removed by scripts/journey_photos.py.
  before: { src: "/journey/before.jpg", width: 720, height: 900, alt: "Alex before he started kettlebell training" },
  after: { src: "/journey/after.jpg", width: 720, height: 900, alt: "Alex today, lean and muscular after kettlebell training" },
  beforeLabel: "Before",
  afterLabel: "Now",
  caption: "Alex, before he started training and today. Both from his own reel.",
  // Empty: the follower count is shown in "About Alex" directly above, and
  // "3 ways to train" said nothing new. Add real milestones from Alex here.
  highlights: [],
};
