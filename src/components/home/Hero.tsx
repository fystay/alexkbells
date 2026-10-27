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
 * rounded corners and the words bottom-left on it.
 * Words live in content/home.ts.
 */
export function Hero() {
  const cta = getPrimaryCtaFor("group-class");
  return (
    <section aria-labelledby="hero-heading" className="bg-paper sm:pt-5 sm:pb-8">
      <div className="relative sm:container-page">
        <div className="relative h-[calc(100svh-6.75rem)] min-h-[30rem] sm:h-[24rem] lg:h-[min(30rem,calc(100svh-14rem))]">
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
          <div className="absolute inset-x-4 bottom-6 z-10 text-white sm:bottom-10 sm:left-10 sm:right-auto sm:max-w-xl">
            {/* In the site's own type (owner, 2026-10-27, after the audit): the headline in
                the display face, sentence case; the second line as a label in spaced
                capitals, like the logo's tagline. No side rule or glow: a soft ink
                shadow keeps the white words readable on the film. */}
            <h1 id="hero-heading">
              <span className="hero-shadow block font-display text-[clamp(3rem,1.9rem+4.6vw,5.25rem)] leading-[1.02]">{hero.headline}</span>
              <span className="hero-shadow eyebrow mt-4 block text-white">{hero.headlineSecondary}</span>
            </h1>
            {/* One button; the second option is a quieter text link (owner, 2026-10-23). */}
            <div className="mt-6 flex items-center gap-5 sm:mt-7 sm:gap-7">
              <StartTraining href={cta.href} label={cta.kind === "booking" ? hero.primaryLabel : cta.label} external={cta.external} onDark className="flex-1 sm:w-56 sm:flex-none" />
              <Link
                href="/coaching"
                className="hero-shadow inline-flex min-h-11 items-center text-sm font-semibold whitespace-nowrap text-white underline underline-offset-4 hover:no-underline sm:text-base"
              >
                {hero.secondaryLabel}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
