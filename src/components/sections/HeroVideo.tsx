"use client";

import { useEffect, useRef, useState } from "react";

interface HeroVideoProps {
  sources: { src: string; type: string }[];
  poster: string;
  className?: string;
}

/**
 * Decorative, silent, looping hero footage.
 * - Never autoplays for visitors who prefer reduced motion (poster only).
 * - Visible pause/play control (WCAG 2.2.2) for motion longer than 5 s.
 * - Starts after hydration, so the poster is the first paint.
 */
export function HeroVideo({ sources, poster, className }: HeroVideoProps) {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduce.matches) return;
    // Autoplay can still be refused (e.g. low-power mode); the button remains.
    video.play().then(
      () => setPlaying(true),
      () => setPlaying(false),
    );
  }, []);

  const toggle = () => {
    const video = ref.current;
    if (!video) return;
    if (video.paused) {
      video.play().then(
        () => setPlaying(true),
        () => setPlaying(false),
      );
    } else {
      video.pause();
      setPlaying(false);
    }
  };

  return (
    <div className={className}>
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-ink">
        <video
          ref={ref}
          poster={poster}
          muted
          loop
          playsInline
          preload="metadata"
          aria-hidden="true"
          tabIndex={-1}
          className="size-full object-cover"
        >
          {sources.map((s) => (
            <source key={s.src} src={s.src} type={s.type} />
          ))}
        </video>
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? "Pause background video" : "Play background video"}
          className="absolute right-3 bottom-3 inline-flex size-11 items-center justify-center bg-ink/75 text-paper transition-colors hover:bg-ink"
        >
          <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4" fill="currentColor">
            {playing ? (
              <path d="M4 2h3v12H4zM9 2h3v12H9z" />
            ) : (
              <path d="M4 2l10 6-10 6z" />
            )}
          </svg>
        </button>
      </div>
    </div>
  );
}
