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
  /** Home hero until the owner's film is added (content/media.ts). Wide crop of a tall photo, so the focal point matters. */
  hero: {
    src: `${dir}/hero-coach-kettlebell-swing.jpg`,
    width: 1100,
    height: 1949,
    alt: "A coach demonstrates a two-handed kettlebell swing in a training studio while a group follows behind",
    position: "50% 45%",
  },
  /** "1:1 coaching" card in Ways to train (owner's photo, 2026-10-23). */
  oneToOne: {
    src: `${dir}/one-to-one-swing.jpg`,
    width: 942,
    height: 1669,
    alt: "A man in a teal T-shirt swings a kettlebell to chest height, with a second person swinging behind him",
    position: "50% 40%",
  },
  /** Group classes page header (desktop only). */
  classes: {
    src: `${dir}/class-swing-wide.jpg`,
    width: 1200,
    height: 1770,
    alt: "A group in a dark training studio mid-way through kettlebell swings, one person in the foreground",
    position: "50% 55%",
  },
  /** "Why kettlebells" (option C, owner 2026-10-23): one photo beside the numbered list. Cropped so no third-party signage shows. */
  whyKettlebells: {
    src: "/images/why/class-swing.jpg",
    width: 600,
    height: 800,
    alt: "A man in a teal T-shirt at the bottom of a kettlebell swing, with the class swinging behind him",
    position: "50% 15%",
  },
} satisfies Record<string, Photo>;

export type ImageRole = keyof typeof images;
