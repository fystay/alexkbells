import type { Photo } from "./types";

/**
 * Every photograph on the site, by role. To replace a picture, drop the new
 * file into public/images/raeng/ (or overwrite the existing one) and edit
 * its entry here: no component needs to change.
 *
 * Recommended: portrait 4:5 or taller, 1100 px wide or more, JPEG at
 * roughly 80% quality. `position` sets the focal point when a frame is
 * cropped (CSS object-position). Describe what is visible in `alt`, nothing
 * more: never name people unless they have agreed to be named.
 *
 * The current files are photographs supplied by the project owner on
 * 2026-10-21 as the working set. They show real people training. Confirm
 * that everyone shown is happy to appear on the website, and replace any
 * frame that isn't (see CORE.md).
 */
const dir = "/images/raeng";

export const images = {
  /** Home hero (desktop: right column; phones: full-bleed under the header). */
  hero: {
    src: `${dir}/hero-coach-kettlebell-swing.jpg`,
    width: 1100,
    height: 1949,
    alt: "A coach demonstrates a two-handed kettlebell swing in a training studio while a group follows behind",
    position: "50% 30%",
  },
  /** Group classes: card, page header. */
  classes: {
    src: `${dir}/class-swing-wide.jpg`,
    width: 1200,
    height: 1770,
    alt: "A group in a dark training studio mid-way through kettlebell swings, one person in the foreground",
    position: "50% 55%",
  },
  /** One-to-one coaching: card, page header. */
  oneToOne: {
    src: `${dir}/class-swing-line.jpg`,
    width: 1100,
    height: 1877,
    alt: "A person in a blue top swings a kettlebell in the foreground while a line of people train behind",
    position: "25% 60%",
  },
  /** Online coaching: card, page header. Equipment only: no people. */
  online: {
    src: `${dir}/equipment-kettlebell-row.jpg`,
    width: 1200,
    height: 1600,
    alt: "A row of black cast-iron kettlebells with coloured weight bands against a dark wall",
    position: "40% 50%",
  },
  /** Philosophy section and the About page: focus and discipline. */
  discipline: {
    src: `${dir}/class-standing-row.jpg`,
    width: 1100,
    height: 1949,
    alt: "A line of people stand ready, each holding a kettlebell in both hands, in a dark training studio",
    position: "30% 15%",
  },
  /** Community section. */
  communityFocus: {
    src: `${dir}/class-three-focused.jpg`,
    width: 1100,
    height: 1942,
    alt: "Three people stand side by side on training mats, each holding a kettlebell with both hands",
    position: "40% 40%",
  },
  community: {
    src: `${dir}/community-group-a.jpg`,
    width: 1400,
    height: 1867,
    alt: "A group of people crouching and standing together for a photo in the training studio after a session",
    position: "50% 60%",
  },
  /** About page, second group frame. */
  communityAlt: {
    src: `${dir}/community-group-b.jpg`,
    width: 1400,
    height: 2223,
    alt: "A smaller group posing together on the studio mats after training",
    position: "50% 55%",
  },
  /** Spare group frame, not currently placed. */
  communitySpare: {
    src: `${dir}/community-group-c.jpg`,
    width: 1400,
    height: 1867,
    alt: "A group gathered on the studio mats after a session",
    position: "50% 60%",
  },
  /** Alex's portrait (supplied by the project owner 2026-10-17). Replace with a current portrait when available. */
  coach: {
    src: "/images/alex/about.jpg",
    width: 720,
    height: 900,
    alt: "Alex standing in the gym among kettlebells",
  },
  /** Open Graph / about: equipment texture. */
  equipment: {
    src: `${dir}/equipment-kettlebell-row.jpg`,
    width: 1200,
    height: 1600,
    alt: "A row of black cast-iron kettlebells with coloured weight bands against a dark wall",
    position: "40% 50%",
  },
} satisfies Record<string, Photo>;

export type ImageRole = keyof typeof images;
