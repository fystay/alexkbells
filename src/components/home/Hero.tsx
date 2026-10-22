import { hero } from "@/content/home";
import { images } from "@/content/images";
import { heroVideo } from "@/content/media";
import { getPrimaryCtaFor } from "@/lib/booking";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { PhotoFrame } from "@/components/ui/PhotoFrame";
import { StartTraining } from "@/components/ui/StartTraining";
import { HeroVideo } from "./HeroVideo";

/**
 * The owner's film (content/media.ts) sits inside the page like a framed
 * picture on a cream mat: the same margins as the rest of the page, rounded
 * corners, and the words on a bordered cream panel that overlaps its lower
 * edge so the two read as one piece. No tint, blur or gradient.
 * Words live in content/home.ts.
 */
export function Hero() {
  const cta = getPrimaryCtaFor("group-class");
  return (
    <section aria-labelledby="hero-heading" className="bg-paper pt-4 pb-10 sm:pt-6 sm:pb-16">
      <div className="container-page relative">
        <div className="relative h-[min(24rem,46svh)] sm:h-[30rem] lg:h-[min(36rem,calc(100svh-9rem))]">
          {heroVideo ? (
            <HeroVideo
              sources={heroVideo.sources}
              poster={heroVideo.poster}
              position={heroVideo.position}
              controlClassName="top-3 right-3 sm:top-4 sm:right-4"
              className="absolute inset-0"
            />
          ) : (
            <PhotoFrame photo={images.hero} sizes="100vw" priority className="absolute inset-0" />
          )}
        </div>
        <div className="relative z-10 mx-3 -mt-14 rounded-lg border border-grey bg-paper p-5 sm:absolute sm:bottom-[-2.5rem] sm:left-10 sm:mx-0 sm:mt-0 sm:max-w-xl sm:p-8">
          <h1 id="hero-heading" className="font-display text-h1 text-balance sm:text-h2 sm:whitespace-nowrap">
            {hero.headline}
            <span className="block text-grey">{hero.headlineSecondary}</span>
          </h1>
          <p className="mt-3 max-w-md text-lede sm:mt-4">{hero.copy}</p>
          <div className="mt-5 flex flex-col gap-3 sm:mt-7 sm:flex-row sm:items-center">
            <StartTraining href={cta.href} label={cta.kind === "booking" ? hero.primaryLabel : cta.label} external={cta.external} className="w-full sm:w-64" />
            <ButtonLink href="/coaching" variant="secondary" className="w-full sm:w-auto">
              {hero.secondaryLabel}
            </ButtonLink>
          </div>
        </div>
      </div>
    </section>
  );
}
