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
 * A cut in the style of the JD Gyms hero (owner's reference, 2026-10-22)
 * from the owner's own class footage (phone clips supplied 2026-10-21): each
 * shot one whole movement cut at its natural end (about 1-1.6 s; the group shot opens it, then only close-ups of individuals; 18 s on phones,
 * 12 s on desktop; the crop follows each person's face so heads stay in
 * frame), slow motion at the moment of effort, a speed-up
 * into each move, whip-pan swipes left and right with motion blur between some
 * clips, hard cuts elsewhere, and slow push-in zooms. Faces in frame, no
 * third-party signage, nobody lying down; grade C. The source clips are only
 * 464-576 px wide, so it is soft on big screens. Rebuild with
 * `python3 scripts/hero_edit.py <clips> public/media`; it lists every shot.
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
