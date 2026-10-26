import { hero } from "@/content/home";
import { images } from "@/content/images";
import { heroVideo } from "@/content/media";
import { site } from "@/content/site";
import { getPrimaryCtaFor } from "@/lib/booking";
import Link from "next/link";
import { PhotoFrame } from "@/components/ui/PhotoFrame";
import { StartTraining } from "@/components/ui/StartTraining";
import { HeroVideo } from "./HeroVideo";

/**
 * Warm tech (owner's pick C, 2026-10-26): the words centred on the cream page
 * (a small label, "Train with purpose.", one line beneath, Book now with
 * Explore coaching beside it), then the film below in a rounded frame: 4:5
 * on phones (the vertical cut), 16:9 on tablets and the film's own 2:1 from
 * 1024px, so nothing is cropped on desktop. Nothing sits on the film.
 * Words live in content/home.ts.
 */
export function Hero() {
  const cta = getPrimaryCtaFor("group-class");
  return (
    <section aria-labelledby="hero-heading" className="bg-paper pt-10 pb-6 sm:pt-16 lg:pt-20">
      <div className="container-page">
        <div className="mx-auto max-w-3xl text-center">
          <p className="eyebrow">Kettlebell classes · {site.location.town}</p>
          <h1 id="hero-heading" className="mt-3 font-display text-display text-balance">
            {hero.headline}
          </h1>
          {/* One intro line: the second half of the motto, then the three ways to train. */}
          <p className="mx-auto mt-5 max-w-md text-lede text-balance lg:max-w-2xl">
            {hero.headlineSecondary} {hero.summary}
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            <StartTraining href={cta.href} label={cta.kind === "booking" ? hero.primaryLabel : cta.label} external={cta.external} className="min-w-36" />
            <Link href="/coaching" className="inline-flex min-h-11 items-center text-base font-semibold whitespace-nowrap underline-offset-4 hover:underline">
              {hero.secondaryLabel}
            </Link>
          </div>
        </div>
        <div className="relative mt-8 aspect-[4/5] w-full sm:mt-14 sm:aspect-video lg:aspect-[2/1]">
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
            <PhotoFrame photo={images.hero} sizes="(min-width: 1248px) 1168px, 100vw" priority className="absolute inset-0" />
          )}
        </div>
      </div>
    </section>
  );
}
