import { hero } from "@/content/home";
import { images } from "@/content/images";
import { heroVideo } from "@/content/media";
import { getPrimaryCtaFor } from "@/lib/booking";
import Link from "next/link";
import { PhotoFrame } from "@/components/ui/PhotoFrame";
import { StartTraining } from "@/components/ui/StartTraining";
import { HeroVideo } from "./HeroVideo";

/**
 * On phones the film (a vertical cut) covers the screen edge to edge below
 * the header, with the words straight on the film at the bottom, in white (no box,
 * tint or gradient). Since 2026-10-27 the words and the button use the rest of
 * the site's style (sentence case, a round button) instead of the old
 * production hero's wide capitals and square button. From 640px the film sits inside the page margins with
 * rounded corners and the words bottom-left on it. Layout pass 2026-10-29 (same words and film): a taller film on desktop, the headline on one line, a soft fade under the words, and the button full width with the coaching link centred under it on phones, as in Alex's mockup.
 * Words live in content/home.ts.
 */
export function Hero() {
  const cta = getPrimaryCtaFor("group-class");
  return (
    <section aria-labelledby="hero-heading" className="bg-paper sm:pt-5 sm:pb-8">
      <div className="relative sm:container-page">
        <div className="relative h-[calc(100svh-6.75rem)] min-h-[30rem] sm:h-[min(32rem,calc(100svh-11rem))] lg:h-[min(42rem,calc(100svh-11rem))]">
          {heroVideo ? (
            <HeroVideo
              sources={heroVideo.sources}
              poster={heroVideo.poster}
              portrait={heroVideo.portrait}
              position={heroVideo.position}
              controls={false}
              className="absolute inset-0"
            />
          ) : (
            <PhotoFrame photo={images.hero} sizes="100vw" priority className="absolute inset-0 max-sm:rounded-none" />
          )}
          {/* A soft fade at the foot of the film, so the words sit on a darker base whatever the film shows (layout pass, 2026-10-29). */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden sm:rounded-lg">
            <div className="absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black/70 via-black/35 to-transparent" />
          </div>
          <div className="absolute inset-x-4 bottom-7 z-10 text-white sm:inset-x-auto sm:bottom-12 sm:left-12 sm:max-w-3xl">
            {/* In the site's own type (owner, 2026-10-27, after the audit): the headline in
                the display face, sentence case; the second line as a label in spaced
                capitals, like the logo's tagline. No side rule or glow: a soft ink
                shadow keeps the white words readable on the film. */}
            <h1 id="hero-heading">
              <span className="hero-shadow block font-display text-[clamp(3rem,1.9rem+4.6vw,5.25rem)] leading-[1.02]">{hero.headline}</span>
              <span className="hero-shadow mt-3 block text-xl leading-snug font-semibold sm:text-2xl">{hero.tagline}</span>
              <span className="hero-shadow eyebrow mt-4 block text-white">{hero.headlineSecondary}</span>
            </h1>
            {/* One button; the second option is a quieter text link (owner, 2026-10-23). */}
            <div className="mt-7 flex flex-col items-stretch gap-2 sm:mt-8 sm:flex-row sm:items-center sm:gap-8">
              <StartTraining href={cta.href} label={cta.kind === "booking" ? hero.bookLabel : cta.label} external={cta.external} onDark className="w-full sm:w-64" />
              <Link
                href="/coaching"
                className="hero-shadow inline-flex min-h-11 items-center justify-center text-base font-semibold whitespace-nowrap text-white underline underline-offset-4 hover:no-underline sm:justify-start"
              >
                {hero.secondaryLabel}
                <span aria-hidden="true"> ↗</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
