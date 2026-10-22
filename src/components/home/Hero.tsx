import { images } from "@/content/images";
import { heroVideo } from "@/content/media";
import { site } from "@/content/site";
import { getPrimaryCta } from "@/lib/booking";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { PhotoFrame } from "@/components/ui/PhotoFrame";
import { StartTraining } from "@/components/ui/StartTraining";
import { HeroVideo } from "./HeroVideo";

/**
 * Clean opening: one picture whose edges melt into the cream page (the owner's film from content/media.ts,
 * or a still if none is set) and the words beside or beneath it, so
 * nothing sits on top of the footage and its colours stay as filmed. On
 * phones the picture comes first, then the headline and the button, all in
 * the first screen. DOM order is text first so the heading leads for screen readers.
 */
export function Hero() {
  const cta = getPrimaryCta();
  return (
    <section aria-labelledby="hero-heading" className="pt-4 pb-16 sm:pt-6 sm:pb-24 lg:pb-28">
      <div className="container-page flex flex-col lg:grid lg:grid-cols-12 lg:items-center lg:gap-x-14">
        <div className="order-2 mt-6 lg:order-1 lg:col-span-6 lg:mt-0">
          <p className="eyebrow hidden text-muted-inverse sm:block">
            {site.name} {site.descriptor} · Cumbernauld, Glasgow
          </p>
          <h1 id="hero-heading" className="font-display text-h1 text-balance sm:mt-5 lg:text-h2">
            Built through movement.
            <span className="block text-muted-inverse">Defined by discipline.</span>
          </h1>
          <p className="mt-4 max-w-md text-lede text-muted-inverse sm:mt-6">
            Kettlebell classes, flexible memberships and personal coaching, built around good technique and a club that shows up.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:mt-9 sm:flex-row sm:items-center">
            <StartTraining href={cta.href} label={cta.label} external={cta.external} tone="dark" className="w-full sm:w-64" />
            <ButtonLink href="/memberships" tone="dark" variant="secondary" className="w-full sm:w-auto">
              View memberships
            </ButtonLink>
          </div>
        </div>

        <div className="relative order-1 h-[min(24rem,32svh)] min-h-[13rem] sm:h-[26rem] lg:order-2 lg:col-span-5 lg:col-start-8 lg:h-[min(38rem,calc(100svh-9rem))]">
          {heroVideo ? (
            <HeroVideo sources={heroVideo.sources} poster={heroVideo.poster} position={heroVideo.position} className="absolute inset-0" />
          ) : (
            <PhotoFrame photo={images.hero} sizes="(min-width: 1024px) 42vw, 100vw" priority square className="hero-feather absolute inset-0 bg-transparent" />
          )}
        </div>
      </div>
    </section>
  );
}
