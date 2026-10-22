import { hero } from "@/content/home";
import { images } from "@/content/images";
import { heroVideo } from "@/content/media";
import { getPrimaryCtaFor } from "@/lib/booking";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { PhotoFrame } from "@/components/ui/PhotoFrame";
import { StartTraining } from "@/components/ui/StartTraining";
import { HeroVideo } from "./HeroVideo";

/**
 * Full-bleed opening: the owner's film (content/media.ts) fills the first
 * screen edge to edge, with the words on a solid cream panel over it (solid,
 * so the text is always legible without any overlay tint or gradient).
 * Words live in content/home.ts.
 */
export function Hero() {
  const cta = getPrimaryCtaFor("group-class");
  return (
    <section aria-labelledby="hero-heading" className="relative h-[calc(100svh-4rem)] max-h-[52rem] min-h-[34rem] bg-white sm:h-[calc(100svh-5rem)]">
      {heroVideo ? (
        <HeroVideo
          sources={heroVideo.sources}
          poster={heroVideo.poster}
          position={heroVideo.position}
          square
          controlClassName="top-4 right-4 sm:top-6 sm:right-6"
          className="absolute inset-0"
        />
      ) : (
        <PhotoFrame photo={images.hero} sizes="100vw" priority square className="absolute inset-0" />
      )}
      <div className="container-page relative flex h-full items-end pb-4 sm:pb-10">
        <div className="w-full rounded-lg bg-paper p-5 sm:max-w-xl sm:p-8">
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
