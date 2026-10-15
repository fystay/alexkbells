"use client";

import { useEffect, useRef, useState } from "react";

interface HeroVideoProps {
  sources: { src: string; type: string }[];
  poster: string;
  className?: string;
}

/** Network Information API (Chromium only); used to honour data-saver mode. */
type NavigatorWithConnection = Navigator & { connection?: { saveData?: boolean } };

/**
 * Decorative, silent, looping hero footage.
 * - preload="none": nothing is downloaded until playback is wanted; the
 *   poster (identical to the first frame) is the first paint.
 * - Plays only while at least a quarter of it is on screen, and pauses when
 *   scrolled away, to save battery and data.
 * - Never autoplays under prefers-reduced-motion or data-saver; the poster
 *   stays and the button can start it.
 * - Visible pause/play control (WCAG 2.2.2). Once a visitor pauses, it
 *   stays paused until they press play again.
 */
export function HeroVideo({ sources, poster, className }: HeroVideoProps) {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const userPaused = useRef(false);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const saveData = (navigator as NavigatorWithConnection).connection?.saveData === true;
    if (reduceMotion || saveData) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !userPaused.current) {
          // Autoplay can still be refused (e.g. low-power mode); the button remains.
          video.play().then(
            () => setPlaying(true),
            () => setPlaying(false),
          );
        } else if (!entry.isIntersecting && !video.paused) {
          video.pause();
          setPlaying(false);
        }
      },
      { threshold: 0.25 },
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, []);

  const toggle = () => {
    const video = ref.current;
    if (!video) return;
    if (video.paused) {
      userPaused.current = false;
      video.play().then(
        () => setPlaying(true),
        () => setPlaying(false),
      );
    } else {
      userPaused.current = true;
      video.pause();
      setPlaying(false);
    }
  };

  return (
    <div className={className}>
      {/* Width-led: the parent sets the width, the 4:5 frame sets the height. */}
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-ink">
        <video
          ref={ref}
          poster={poster}
          muted
          loop
          playsInline
          preload="none"
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
            {playing ? <path d="M4 2h3v12H4zM9 2h3v12H9z" /> : <path d="M4 2l10 6-10 6z" />}
          </svg>
        </button>
      </div>
    </div>
  );
}
