"use client";

import { useEffect, useRef, useState } from "react";

interface HeroVideoProps {
  sources: { src: string; type: string }[];
  poster: string;
  className?: string;
}

const escapeAttr = (value: string) => value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

/**
 * Silent hero footage that starts on its own as soon as the page opens and
 * loops continuously (Alex's request).
 * - The <video> is written as HTML so `autoplay muted loop playsinline` are
 *   in the server-rendered markup: browsers (iOS included) start it before
 *   any JavaScript runs. React does not render the `muted` attribute, which
 *   autoplay requires.
 * - `loop` repeats it natively; the `ended` handler restarts it in any
 *   browser that stops at the end instead, so it never sits on a blank frame.
 * - Visible pause/play control (WCAG 2.2.2). Once a visitor pauses, it stays
 *   paused until they press play again.
 * - Some devices block autoplay entirely (e.g. iPhone Low Power Mode); the
 *   poster stays and the play button starts it.
 */
export function HeroVideo({ sources, poster, className }: HeroVideoProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const userPaused = useRef(false);
  const [playing, setPlaying] = useState(true);

  const html =
    `<video autoplay muted loop playsinline preload="auto" aria-hidden="true" tabindex="-1" poster="${escapeAttr(poster)}" class="size-full object-contain">` +
    sources.map((s) => `<source src="${escapeAttr(s.src)}" type="${escapeAttr(s.type)}">`).join("") +
    "</video>";

  const video = () => containerRef.current?.querySelector("video") ?? null;

  useEffect(() => {
    const v = containerRef.current?.querySelector("video");
    if (!v) return;
    const sync = () => setPlaying(!v.paused);
    const restart = () => {
      if (userPaused.current) return;
      v.currentTime = 0;
      v.play().catch(sync);
    };
    v.muted = true;
    v.addEventListener("play", sync);
    v.addEventListener("pause", sync);
    v.addEventListener("ended", restart);
    // In case autoplay hasn't started yet (e.g. the page was restored from cache).
    if (v.paused) v.play().catch(sync);
    return () => {
      v.removeEventListener("play", sync);
      v.removeEventListener("pause", sync);
      v.removeEventListener("ended", restart);
    };
  }, []);

  const toggle = () => {
    const v = video();
    if (!v) return;
    if (v.paused) {
      userPaused.current = false;
      v.play().catch(() => setPlaying(false));
    } else {
      userPaused.current = true;
      v.pause();
    }
  };

  return (
    <div className={className}>
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-ink">
        {/* The video element itself is static HTML; see the comment above. */}
        <div ref={containerRef} className="size-full" dangerouslySetInnerHTML={{ __html: html }} />
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? "Pause background video" : "Play background video"}
          className="absolute top-3 right-3 z-20 inline-flex size-11 sm:top-auto sm:bottom-3 items-center justify-center bg-ink/75 text-paper transition-colors hover:bg-ink"
        >
          <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4" fill="currentColor">
            {playing ? <path d="M4 2h3v12H4zM9 2h3v12H9z" /> : <path d="M4 2l10 6-10 6z" />}
          </svg>
        </button>
      </div>
    </div>
  );
}
