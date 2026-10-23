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
  /** Group classes page header (desktop only). */
  classes: {
    src: `${dir}/class-swing-wide.jpg`,
    width: 1200,
    height: 1770,
    alt: "A group in a dark training studio mid-way through kettlebell swings, one person in the foreground",
    position: "50% 55%",
  },
  /**
   * "Why kettlebells" tiles (2026-10-23): stills from the owner's class footage,
   * taken from the hero film (faces in frame, no third-party signage).
   */
  whyStrength: { src: "/images/why/strength.jpg", width: 540, height: 960, alt: "A man in a green T-shirt locks a kettlebell out overhead", position: "50% 30%" },
  whyConditioning: { src: "/images/why/conditioning.jpg", width: 540, height: 960, alt: "A class swinging kettlebells together in a training studio", position: "50% 55%" },
  whyMovement: { src: "/images/why/movement.jpg", width: 540, height: 960, alt: "A man in a green T-shirt holds a kettlebell at his chest in a deep squat", position: "50% 55%" },
  whyAdaptable: { src: "/images/why/adaptable.jpg", width: 540, height: 960, alt: "A man in a white T-shirt holds a single kettlebell at his chest", position: "50% 35%" },
} satisfies Record<string, Photo>;

export type ImageRole = keyof typeof images;
