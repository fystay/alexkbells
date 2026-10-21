import { images } from "@/content/images";
import { heroVideo } from "@/content/media";
import { site } from "@/content/site";
import { getPrimaryCta } from "@/lib/booking";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { PhotoFrame } from "@/components/ui/PhotoFrame";
import { StartTraining } from "@/components/ui/StartTraining";
import { HeroVideo } from "./HeroVideo";

/**
 * Cinematic opening: the owner's film (content/media.ts) fills the first
 * screen, or, until it is supplied, the hero photograph does. A dark fade
 * keeps the cream text readable on any footage, and the text sits low so the
 * picture keeps the space above it. The video player is positioned over the
 * photograph so the layout is identical either way.
 */
export function Hero() {
  const cta = getPrimaryCta();
  return (
    <section aria-labelledby="hero-heading" className="relative isolate overflow-hidden bg-ink text-paper">
      <div className="relative h-[calc(100svh-4rem)] min-h-[32rem] max-h-[60rem] sm:h-[calc(100svh-5rem)]">
        {heroVideo ? (
          <HeroVideo sources={heroVideo.sources} poster={heroVideo.poster} className="absolute inset-0" />
        ) : (
          <PhotoFrame photo={images.hero} sizes="100vw" priority square className="absolute inset-0" />
        )}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-linear-to-t from-ink via-ink/55 via-45% to-ink/10 sm:via-ink/40" />

        <div className="container-page relative flex h-full flex-col justify-end pb-10 sm:pb-14 lg:pb-16">
          <p className="eyebrow text-paper/80">
            {site.name} {site.descriptor} · Cumbernauld, Glasgow
          </p>
          <h1 id="hero-heading" className="mt-4 max-w-4xl font-display text-h1 text-balance">
            Built through movement.
            <span className="block text-paper/70">Defined by discipline.</span>
          </h1>
          <p className="mt-5 max-w-lg text-lede text-paper/85">
            Kettlebell classes, flexible memberships and personal coaching, built around good technique and a club that shows up.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <StartTraining href={cta.href} label={cta.label} external={cta.external} tone="dark" className="w-full sm:w-72" />
            <ButtonLink href="/memberships" tone="dark" variant="secondary" className="w-full sm:w-auto">
              View memberships
            </ButtonLink>
          </div>
        </div>
      </div>
    </section>
  );
}
