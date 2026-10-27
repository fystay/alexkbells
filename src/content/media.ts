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

/**
 * The classes page hero film (owner's clip, 2026-10-27: a 13 s phone video of
 * a class, 464 × 832 at 60 fps). The home film's grade C exactly (owner,
 * 2026-10-27: keep the two films consistent; scripts/hero_edit.py GRADE:
 * lifted, contrasty, slightly cool, the lower part darkened under the words),
 * slowed to two thirds speed (smooth from the 60 fps source), fading in and
 * out so the loop is seamless; 19.5 s. Phones get the vertical cut; wider
 * screens the same clip on the right over a blurred, darkened copy of
 * itself (1280 × 544), so the words on the left sit on calm background.
 * The source is only 464 px wide, so it is soft on large screens.
 */
export const classesVideo = {
  sources: [
    { src: "/media/classes.mp4", type: 'video/mp4; codecs="avc1.640028"' },
    { src: "/media/classes.webm", type: 'video/webm; codecs="vp9"' },
  ],
  poster: "/media/classes-poster.jpg",
  position: "50% 50%",
  portrait: {
    sources: [
      { src: "/media/classes-portrait.mp4", type: 'video/mp4; codecs="avc1.640028"' },
      { src: "/media/classes-portrait.webm", type: 'video/webm; codecs="vp9"' },
    ],
    poster: "/media/classes-portrait-poster.jpg",
  },
} as HeroVideoConfig | null;

/** One short silent loop for one step of an explainer (components/ui/Explainer.tsx). */
export interface StepClip {
  sources: { src: string; type: string }[];
  /** First frame: shown while it loads, if it cannot play, and with Reduce Motion. */
  poster: string;
}

const clip = (name: string): StepClip => ({
  sources: [
    { src: `/media/coaching/${name}.mp4`, type: 'video/mp4; codecs="avc1.640028"' },
    { src: `/media/coaching/${name}.webm`, type: 'video/webm; codecs="vp9"' },
  ],
  poster: `/media/coaching/${name}-poster.jpg`,
});

/**
 * Live-action shots for the /coaching explainers (owner's request, 2026-10-27),
 * replacing the line drawings there. All six come from the owner's 23.6 s class
 * clip (supplied 2026-10-27, tripod, 464 × 832 at 60 fps). The other gym's
 * APEX | FREQUENCY roller banner and wall sign were painted out frame by frame
 * (`scripts/signage_clean.py`: a per-pixel background plate with the signs
 * removed, people passing in front kept). Each shot is a 464 × 400 crop at the
 * stage's shape, slowed to two-thirds speed and given the home film's grade C (as the classes film),
 * 4.6 s (one explainer step), with a cross-fade so it loops seamlessly
 * (`scripts/coaching_clips.sh`). It is class footage: it shows Alex coaching and
 * training with a group, not a 1:1 session. Replace with 1:1 footage when there is some.
 */
export const coachingClips = {
  focus: [clip("strength"), clip("technique"), clip("movement")],
  how: [clip("request"), clip("confirm"), clip("together")],
} satisfies Record<string, readonly StepClip[]>;
