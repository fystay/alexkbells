"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { site } from "@/content/site";

/** How long the intro plays before the booking page opens. */
export const INTRO_MS = 2800;

/** Alex's own words: the hero headline and his reel motto ("1% everyday"). */
const WORDS = ["Get stronger.", "Move better.", "1% better, every day."];

interface TrainingIntroProps {
  onSkip: () => void;
}

/**
 * Full-screen interlude between "Start your training" and the booking page:
 * the class footage behind three words that pop in one after another, and a
 * progress line. Decorative: the booking page opens on its own after
 * INTRO_MS, and Skip (focused on open) or Escape goes straight there. Never
 * shown to visitors who prefer reduced motion (see StartTraining).
 */
export function TrainingIntro({ onSkip }: TrainingIntroProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const skipRef = useRef<HTMLButtonElement>(null);
  const video = site.heroVideo;

  useEffect(() => {
    skipRef.current?.focus();
    const v = videoRef.current;
    if (v) {
      // React doesn't render the `muted` attribute; set it before playing.
      v.muted = true;
      void v.play().catch(() => {});
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onSkip();
    };
    document.addEventListener("keydown", onKey);
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
    };
  }, [onSkip]);

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Opening the booking page"
      className="fixed inset-0 z-[60] flex flex-col bg-ink text-paper animate-intro-in"
    >
      {video ? (
        <video
          ref={videoRef}
          aria-hidden="true"
          playsInline
          loop
          poster={video.poster}
          className="absolute inset-0 size-full object-cover opacity-60"
        >
          {video.sources.map((s) => (
            <source key={s.src} src={s.src} type={s.type} />
          ))}
        </video>
      ) : null}
      <div aria-hidden="true" className="absolute inset-0 bg-linear-to-t from-ink via-ink/50 to-ink/70" />

      <div className="relative flex justify-end p-4 sm:p-6">
        <button
          ref={skipRef}
          type="button"
          onClick={onSkip}
          className="inline-flex min-h-11 items-center px-3 text-sm font-semibold uppercase tracking-[0.1em] text-paper/80 hover:text-paper focus-visible:outline-paper"
        >
          Skip
        </button>
      </div>

      <div className="relative container-page mt-auto pb-16 sm:pb-24">
        <p className="sr-only" role="status">
          Opening the booking page…
        </p>
        <ul aria-hidden="true" className="space-y-1">
          {WORDS.map((word, i) => (
            <li
              key={word}
              className="font-display text-display text-paper opacity-0 animate-intro-word [text-shadow:0_0_28px_rgb(246_244_239/0.3)]"
              style={{ animationDelay: `${150 + i * 700}ms` }}
            >
              {word}
            </li>
          ))}
        </ul>
        <div aria-hidden="true" className="mt-10 h-px w-full bg-paper/20">
          <div className="h-px origin-left bg-paper animate-intro-progress" style={{ animationDuration: `${INTRO_MS}ms` }} />
        </div>
      </div>
    </div>,
    document.body,
  );
}
