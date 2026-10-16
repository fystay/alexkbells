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
 * loops continuously (Alex's request), except for visitors who ask for
 * reduced motion: they see the still poster and can press play.
 * - The <video> is written as HTML so `autoplay muted loop playsinline` are
 *   in the server-rendered markup: browsers (iOS included) start it before
 *   any JavaScript runs. React does not render the `muted` attribute, which
 *   autoplay requires.
 * - `loop` repeats it natively; the `ended` handler restarts it in any
 *   browser that stops at the end instead, so it never sits on a blank frame.
 * - Visible pause/play control (WCAG 2.2.2). Once a visitor pauses, it stays
 *   paused until they press play again.
 * - Some devices block autoplay entirely (e.g. iPhone Low Power Mode): the
 *   poster stays and the play button starts it. If no source can be loaded at
 *   all, the poster (also painted behind the video) stays and the control is
 *   removed, since there is nothing to play.
 * - prefers-reduced-motion: CSS hides the video (showing that poster) from the
 *   first paint, before JavaScript; on hydration it is paused. Pressing play
 *   reveals and starts it.
 */
export function HeroVideo({ sources, poster, className }: HeroVideoProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const userPaused = useRef(false);
  const [playing, setPlaying] = useState(true);
  /** Set once the visitor presses play; lifts the reduced-motion still. */
  const [userPlayed, setUserPlayed] = useState(false);
  /** No source could be loaded: show the still poster and no play/pause control. */
  const [unavailable, setUnavailable] = useState(false);

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
    // Source errors fire on the <source> elements, and may already have
    // happened before hydration, so check the network state as well.
    const lastSource = v.querySelector("source:last-of-type");
    const fail = () => setUnavailable(true);
    if (v.networkState === HTMLMediaElement.NETWORK_NO_SOURCE) fail();
    lastSource?.addEventListener("error", fail);
    v.addEventListener("play", sync);
    v.addEventListener("pause", sync);
    v.addEventListener("ended", restart);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // Autoplay is in the server HTML; stop it and rest on the first frame.
      userPaused.current = true;
      v.pause();
      v.currentTime = 0;
      sync();
    } else if (v.paused) {
      // In case autoplay hasn't started yet (e.g. the page was restored from cache).
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
    const v = video();
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
        className="relative aspect-[4/5] w-full overflow-hidden bg-ink bg-contain bg-center bg-no-repeat"
        style={{ backgroundImage: `url("${poster}")` }}
      >
        {/* The video element itself is static HTML; see the comment above. */}
        <div
          ref={containerRef}
          className={userPlayed ? "size-full" : "size-full motion-reduce:invisible"}
          dangerouslySetInnerHTML={{ __html: html }}
        />
        {/* Phones and tablets: the top of the frame fades from the header's ink
            into the footage so the header and video read as one block. Not on
            desktop, where the video sits on paper clear of the header. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 z-10 h-[22%] bg-linear-to-b from-ink via-ink/40 to-transparent lg:hidden"
        />
        {unavailable ? null : (
          <button
            type="button"
            onClick={toggle}
            aria-label={playing ? "Pause background video" : "Play background video"}
            className="absolute top-3 right-3 z-20 inline-flex size-11 items-center justify-center bg-ink/75 text-paper transition-colors hover:bg-ink focus-visible:outline-paper lg:top-auto lg:bottom-3"
          >
            <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4" fill="currentColor">
              {playing ? <path d="M4 2h3v12H4zM9 2h3v12H9z" /> : <path d="M4 2l10 6-10 6z" />}
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
