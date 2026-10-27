"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import type { Photo } from "@/content/types";
import { StartTraining } from "@/components/ui/StartTraining";

interface ClassesHeroProps {
  photos: readonly Photo[];
  eyebrow: string;
  title: string;
  cta: { href: string; label: string; external?: boolean };
  moreHref: string;
  moreLabel: string;
}

/**
 * The classes page opening, in the home hero's frame: edge to edge under the
 * header on phones, a rounded panel from 640px, white words straight on the
 * pictures. The pictures crossfade slowly and each pushes in a little; the one
 * `h1` is here. Visitors who prefer reduced motion see the first picture still,
 * and everyone can pause or jump to a photo (WCAG 2.2.2), with the same progress bar as the memberships explainer. Each picture has its own description; only the one showing is read out.
 */
export function ClassesHero({ photos, eyebrow, title, cta, moreHref, moreLabel }: ClassesHeroProps) {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);

  const next = () => setCurrent((c) => (c + 1) % photos.length);

  return (
    <section aria-labelledby="classes-hero-heading" className="bg-paper sm:pt-5 sm:pb-8">
      <div className="relative sm:container-page">
        <div className="relative h-[min(34rem,calc(100svh-9rem))] min-h-[26rem] overflow-hidden bg-ink sm:h-[22rem] sm:rounded-3xl lg:h-[min(28rem,calc(100svh-14rem))]">
          <div className="absolute inset-0">
            {photos.map((photo, i) => (
              <div key={photo.src} data-active={i === current ? "" : undefined} aria-hidden={i === current ? undefined : true} className="ch-slide absolute inset-0">
                <Image
                  src={photo.src}
                  alt={photo.alt}
                  fill
                  sizes="(min-width: 1248px) 1200px, 100vw"
                  priority={i === 0}
                  className="object-cover"
                  style={photo.position ? { objectPosition: photo.position } : undefined}
                />
              </div>
            ))}
          </div>

          {photos.length > 1 ? (
            <div className="ch-controls absolute inset-x-4 top-4 z-10 flex items-center gap-4 sm:inset-x-5 sm:top-5" data-paused={paused || undefined}>
              <div className="grid min-w-0 flex-1" style={{ gridTemplateColumns: `repeat(${photos.length}, 1fr)`, gap: "0.375rem" }}>
                {photos.map((photo, i) => (
                  <button
                    key={photo.src}
                    type="button"
                    onClick={() => setCurrent(i)}
                    aria-label={`Show photo ${i + 1} of ${photos.length}`}
                    aria-current={i === current ? "true" : undefined}
                    className="ch-seg"
                  >
                    <span className="ch-track">
                      <i
                        key={i === current ? `cur-${current}` : "idle"}
                        className={i < current ? "ch-fill ch-done" : i === current ? "ch-fill ch-cur" : "ch-fill"}
                        onAnimationEnd={() => {
                          if (!paused && i === current) next();
                        }}
                      />
                    </span>
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setPaused((p) => !p)}
                aria-pressed={paused}
                aria-label={paused ? "Play the photos" : "Pause the photos"}
                className="grid size-11 shrink-0 place-items-center rounded-full border border-white text-white hover:bg-white hover:text-ink"
              >
                <svg viewBox="0 0 16 16" className="size-4 fill-current" aria-hidden="true">
                  <path d={paused ? "M4 2l10 6-10 6z" : "M3 2h4v12H3zM9 2h4v12H9z"} />
                </svg>
              </button>
            </div>
          ) : null}

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
