import { hero } from "@/content/home";
import { images } from "@/content/images";
import { heroVideo } from "@/content/media";
import { getPrimaryCtaFor } from "@/lib/booking";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { PhotoFrame } from "@/components/ui/PhotoFrame";
import { StartTraining } from "@/components/ui/StartTraining";
import { HeroVideo } from "./HeroVideo";

/**
 * Video-led opening: the owner's film (content/media.ts) beside the words on
 * desktop and above them on phones, with its edges dissolving into the page.
 * Words live in content/home.ts. DOM order is text first so the heading leads
 * for screen readers; the picture is ordered first on phones with CSS.
 */
export function Hero() {
  const cta = getPrimaryCtaFor("group-class");
  return (
    <section aria-labelledby="hero-heading" className="bg-paper pt-4 pb-10 sm:pt-6 sm:pb-14 lg:pb-16">
      <div className="container-page flex flex-col lg:grid lg:grid-cols-12 lg:items-center lg:gap-x-14">
        <div className="order-2 mt-6 lg:order-1 lg:col-span-6 lg:mt-0">
          <h1 id="hero-heading" className="font-display text-h1 text-balance lg:text-display-split">
            {hero.headline}
            <span className="block text-grey">{hero.headlineSecondary}</span>
          </h1>
          <p className="mt-4 max-w-md text-lede sm:mt-6">{hero.copy}</p>
          <div className="mt-6 flex flex-col gap-3 sm:mt-9 sm:flex-row sm:items-center">
            <StartTraining href={cta.href} label={cta.kind === "booking" ? hero.primaryLabel : cta.label} external={cta.external} className="w-full sm:w-64" />
            <ButtonLink href="/coaching" variant="secondary" className="w-full sm:w-auto">
              {hero.secondaryLabel}
            </ButtonLink>
          </div>
        </div>

        <div className="relative order-1 h-[min(20rem,34svh)] min-h-[13rem] sm:h-[24rem] lg:order-2 lg:col-span-5 lg:col-start-8 lg:h-[min(34rem,calc(100svh-9rem))]">
          {heroVideo ? (
            <HeroVideo sources={heroVideo.sources} poster={heroVideo.poster} position={heroVideo.position} className="absolute inset-0" />
          ) : (
            <PhotoFrame photo={images.hero} sizes="(min-width: 1024px) 42vw, 100vw" priority className="absolute inset-0" />
          )}
        </div>
      </div>
    </section>
  );
}
