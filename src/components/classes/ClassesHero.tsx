"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { Photo } from "@/content/types";
import { StartTraining } from "@/components/ui/StartTraining";

const SLIDE_MS = 5500;

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
 * and everyone can pause (WCAG 2.2.2). Each picture has its own description; only the one showing is read out.
 */
export function ClassesHero({ photos, eyebrow, title, cta, moreHref, moreLabel }: ClassesHeroProps) {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || photos.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = window.setInterval(() => setCurrent((c) => (c + 1) % photos.length), SLIDE_MS);
    return () => window.clearInterval(id);
  }, [paused, photos.length]);

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
            <button
              type="button"
              onClick={() => setPaused((p) => !p)}
              aria-pressed={paused}
              aria-label={paused ? "Play the photos" : "Pause the photos"}
              className="ch-pause absolute top-4 right-4 z-10 grid size-11 place-items-center rounded-full border border-white text-white hover:bg-white hover:text-ink sm:top-5 sm:right-5"
            >
              <svg viewBox="0 0 16 16" className="size-4 fill-current" aria-hidden="true">
                <path d={paused ? "M4 2l10 6-10 6z" : "M3 2h4v12H3zM9 2h4v12H9z"} />
              </svg>
            </button>
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
