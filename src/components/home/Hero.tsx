import { hero } from "@/content/home";
import { site } from "@/content/site";
import { images } from "@/content/images";
import { heroVideo } from "@/content/media";
import { getPrimaryCtaFor } from "@/lib/booking";
import { PhotoFrame } from "@/components/ui/PhotoFrame";
import { StartTraining } from "@/components/ui/StartTraining";
import { HeroVideo } from "./HeroVideo";

/**
 * On phones the film (a vertical cut) covers the screen edge to edge below
 * the header, with the words straight on the film at the bottom, in white (no box,
 * tint or gradient). From 640px the film sits inside the page margins with
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
            {/* Option C (owner, 2026-10-22): a stacked statement beside a thin white rule,
                the second line in spaced capitals like the logo's tagline. */}
            <h1 id="hero-heading" className="border-l-2 border-white pl-4 sm:pl-5">
              <span className="hero-glow block font-display text-[clamp(2.75rem,1.9rem+3.6vw,4.75rem)] leading-[0.95]">
                {hero.headline.split(" ").map((word) => (
                  <span key={word} className="block">
                    {word}{" "}
                  </span>
                ))}
              </span>
              <span className="hero-glow mt-3 block font-display text-xs tracking-[0.28em] sm:mt-4 sm:text-sm">
                {hero.headlineSecondary}
              </span>
            </h1>
            {/* What RAENG is, in one line (mobile-first redesign, 2026-10-24). */}
            <p className="hero-glow mt-4 text-base sm:text-lg">Kettlebell classes in {site.location.town}.</p>
            {/* One action on the first screen; the other services come further down. */}
            <StartTraining href={cta.href} label={cta.kind === "booking" ? hero.primaryLabel : cta.label} external={cta.external} onDark className="mt-6 w-full sm:mt-7 sm:w-64" />
          </div>
        </div>
      </div>
    </section>
  );
}
