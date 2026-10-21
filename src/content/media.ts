/**
 * The homepage hero film. Null until the owner's own footage is supplied:
 * the hero then shows the still photograph from content/images.ts instead.
 *
 * To switch it on:
 *   1. Put the files in public/media/ (an H.264 .mp4 first, ideally also a
 *      .webm; landscape 16:9, silent or muted, 8-15 s loop, under about 4 MB;
 *      colour footage that suits the cream/black palette).
 *   2. Cut a still of the first frame as the poster (.jpg, 1920 px wide).
 *   3. Fill in the object below.
 */
export interface HeroVideoConfig {
  sources: { src: string; type: string }[];
  /** First frame, shown before the film loads and for visitors who prefer reduced motion. */
  poster: string;
  /** Wide view of what the film shows, for the poster image's alt text. Empty if purely atmospheric. */
  posterAlt: string;
}

export const heroVideo = null as HeroVideoConfig | null;
// Example:
// export const heroVideo: HeroVideoConfig = {
//   sources: [
//     { src: "/media/hero.mp4", type: 'video/mp4; codecs="avc1.64001F"' },
//     { src: "/media/hero.webm", type: 'video/webm; codecs="vp9"' },
//   ],
//   poster: "/media/hero-poster.jpg",
//   posterAlt: "",
// };
