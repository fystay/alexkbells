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
            {/* One button; the second option is a quieter text link (owner, 2026-10-23). */}
            <div className="mt-6 flex items-center gap-5 sm:mt-7 sm:gap-7">
              <StartTraining href={cta.href} label={cta.kind === "booking" ? hero.primaryLabel : cta.label} external={cta.external} onDark className="flex-1 sm:w-56 sm:flex-none" />
              <Link
                href="/coaching"
                className="inline-flex min-h-11 items-center text-xs font-semibold uppercase tracking-[0.08em] whitespace-nowrap text-white underline underline-offset-[6px] hover:no-underline sm:text-sm"
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
