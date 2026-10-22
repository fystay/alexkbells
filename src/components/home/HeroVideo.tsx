"use client";

import { useEffect, useRef, useState } from "react";

interface HeroVideoProps {
  sources: { src: string; type: string }[];
  poster: string;
  /** CSS object-position for the crop. */
  position?: string;
  className?: string;
  /** Square edges for a full-bleed film. */
  square?: boolean;
  /** Where the pause button sits (Tailwind position classes). */
  controlClassName?: string;
}

const escapeAttr = (value: string) => value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

/**
 * Silent hero footage that fills its parent, starts on its own and loops,
 * except for visitors who ask for reduced motion: they see the poster and can
 * press play.
 * - The <video> is written as HTML so `autoplay muted loop playsinline` are in
 *   the server-rendered markup (iOS starts it before JavaScript; React does
 *   not render the `muted` attribute autoplay needs).
 * - An `ended` handler restarts it in any browser that ignores `loop`.
 * - A visible pause/play control (WCAG 2.2.2). Once paused it stays paused.
 * - Where autoplay is blocked (e.g. Low Power Mode) the poster stays and the
 *   button starts it. If no source loads at all, the poster stays and the
 *   control is removed.
 * - The video is decorative (aria-hidden); the page makes sense without it.
 */
export function HeroVideo({ sources, poster, position = "50% 50%", className, square = false, controlClassName = "right-4 bottom-4 sm:right-6 sm:bottom-6" }: HeroVideoProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const userPaused = useRef(false);
  const [playing, setPlaying] = useState(true);
  const [userPlayed, setUserPlayed] = useState(false);
  const [unavailable, setUnavailable] = useState(false);

  const html =
    `<video autoplay muted loop playsinline preload="auto" aria-hidden="true" tabindex="-1" poster="${escapeAttr(poster)}" class="size-full object-cover" style="object-position:${escapeAttr(position)}">` +
    sources.map((s) => `<source src="${escapeAttr(s.src)}" type="${escapeAttr(s.type)}">`).join("") +
    "</video>";

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
    const lastSource = v.querySelector("source:last-of-type");
    const fail = () => setUnavailable(true);
    if (v.networkState === HTMLMediaElement.NETWORK_NO_SOURCE) fail();
    lastSource?.addEventListener("error", fail);
    v.addEventListener("play", sync);
    v.addEventListener("pause", sync);
    v.addEventListener("ended", restart);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      userPaused.current = true;
      v.pause();
      v.currentTime = 0;
      sync();
    } else if (v.paused) {
      v.play().catch(sync);
    }
    return () => {
      lastSource?.removeEventListener("error", fail);
      v.removeEventListener("play", sync);
      v.removeEventListener("pause", sync);
      v.removeEventListener("ended", restart);
    };
  }, []);

  const toggle = () => {
    const v = containerRef.current?.querySelector("video");
    if (!v) return;
    if (v.paused) {
      userPaused.current = false;
      setUserPlayed(true);
      v.play().catch(() => setPlaying(false));
    } else {
      userPaused.current = true;
      v.pause();
    }
  };

  return (
    <div className={className}>
      <div
        className={`absolute inset-0 overflow-hidden bg-white${square ? "" : " rounded-lg"}`}
        style={{ backgroundImage: `url("${poster}")`, backgroundSize: "cover", backgroundPosition: position }}
      >
        <div
          ref={containerRef}
          className={userPlayed ? "size-full" : "size-full motion-reduce:invisible"}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
      {unavailable ? null : (
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? "Pause background video" : "Play background video"}
          className={`absolute z-20 inline-flex size-11 items-center justify-center border border-ink bg-paper text-ink transition-colors hover:bg-ink hover:text-paper ${controlClassName}`}
        >
          <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4" fill="currentColor">
            {playing ? <path d="M4 2h3v12H4zM9 2h3v12H9z" /> : <path d="M4 2l10 6-10 6z" />}
          </svg>
        </button>
      )}
    </div>
  );
}
