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
}

/**
 * Cut from the owner's own class footage (supplied 2026-10-21; the unedited
 * clip is a 14 s vertical phone video of a class swinging together, no signage
 * in frame): first 8.8 s, silent, lifted slightly in brightness and warmth to
 * suit the cream page. Re-cut with ffmpeg if a better clip arrives.
 */
export const heroVideo = {
  sources: [
    { src: "/media/hero.mp4", type: 'video/mp4; codecs="avc1.640028"' },
    { src: "/media/hero.webm", type: 'video/webm; codecs="vp9"' },
  ],
  poster: "/media/hero-poster.jpg",
  position: "50% 58%",
} as HeroVideoConfig | null;
