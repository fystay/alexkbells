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
  /** CSS object-position for the crop (the film is vertical; the card is shorter on phones). */
  position?: string;
  /** A 9:16 cut for phones (under 640 px wide), where the film fills the screen edge to edge. */
  portrait?: { sources: { src: string; type: string }[]; poster: string };
}

/**
 * A fast cut (twelve short shots, 8.6 s on desktop and 7.2 s on phones;
 * whip, zoom and cross transitions, a few in slow motion; silent; seamless
 * loop) from the owner's own class footage (phone clips supplied 2026-10-21).
 * Every shot has faces in frame and one grade (lifted, contrasty, slightly
 * cool; the lower part darkened for the white text) with light sharpening. Shots avoid
 * third-party signage (checked on frame sheets) and people lying down. The
 * source clips are only 464-576 px wide, so it is soft on big screens: replace
 * with the original files when available. Rebuild with `scripts/hero_montage.sh`
 * (and `ORIENT=portrait` for the phone cut); it lists every shot.
 */
export const heroVideo = {
  sources: [
    { src: "/media/hero.mp4", type: 'video/mp4; codecs="avc1.640028"' },
    { src: "/media/hero.webm", type: 'video/webm; codecs="vp9"' },
  ],
  poster: "/media/hero-poster.jpg",
  position: "50% 50%",
  portrait: {
    sources: [
      { src: "/media/hero-portrait.mp4", type: 'video/mp4; codecs="avc1.640028"' },
      { src: "/media/hero-portrait.webm", type: 'video/webm; codecs="vp9"' },
    ],
    poster: "/media/hero-portrait-poster.jpg",
  },
} as HeroVideoConfig | null;
