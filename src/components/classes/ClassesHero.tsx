import Link from "next/link";
import type { Photo } from "@/content/types";
import { heroVideo } from "@/content/media";
import { HeroVideo } from "@/components/home/HeroVideo";
import { PhotoFrame } from "@/components/ui/PhotoFrame";
import { StartTraining } from "@/components/ui/StartTraining";

interface ClassesHeroProps {
  /** Shown instead of the film when the film is switched off. */
  photo: Photo;
  eyebrow: string;
  title: string;
  cta: { href: string; label: string; external?: boolean };
  moreHref: string;
  moreLabel: string;
}

/**
 * The classes page opening, in the home hero's frame and type: edge to edge
 * under the header on phones, a rounded panel from 640px, white words straight
 * on the class footage (the same film as home, vertical on phones; owner,
 * 2026-10-27: so visitors see what a class is like). Silent and looping, with a
 * pause button; visitors who prefer reduced motion get the still. The one `h1`.
 */
export function ClassesHero({ photo, eyebrow, title, cta, moreHref, moreLabel }: ClassesHeroProps) {
  return (
    <section aria-labelledby="classes-hero-heading" className="bg-paper sm:pt-5 sm:pb-8">
      <div className="relative sm:container-page">
        <div className="relative h-[min(34rem,calc(100svh-9rem))] min-h-[26rem] overflow-hidden bg-ink sm:h-[22rem] sm:rounded-3xl lg:h-[min(28rem,calc(100svh-14rem))]">
          {heroVideo ? (
            <HeroVideo
              sources={heroVideo.sources}
              poster={heroVideo.poster}
              portrait={heroVideo.portrait}
              position={heroVideo.position}
              roundControl
              controlClassName="top-4 right-4 sm:top-5 sm:right-5"
              square
              className="absolute inset-0"
            />
          ) : (
            <PhotoFrame photo={photo} sizes="(min-width: 1248px) 1200px, 100vw" priority square className="absolute inset-0" />
          )}

          <div className="absolute inset-x-4 bottom-6 z-10 text-white sm:bottom-9 sm:left-10 sm:right-auto sm:max-w-xl">
            <h1 id="classes-hero-heading">
              <span className="hero-shadow block font-display text-[clamp(2.5rem,1.6rem+4vw,4.5rem)] leading-[1.04] text-balance">{title}</span>
              <span className="hero-shadow eyebrow mt-4 block text-white">{eyebrow}</span>
            </h1>
            <div className="mt-6 flex items-center gap-5 sm:gap-7">
              <StartTraining href={cta.href} label={cta.label} external={cta.external} onDark className="flex-1 sm:w-56 sm:flex-none" />
              <Link
                href={moreHref}
                className="hero-shadow inline-flex min-h-11 items-center text-sm font-semibold whitespace-nowrap text-white underline underline-offset-4 hover:no-underline sm:text-base"
              >
                {moreLabel}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
