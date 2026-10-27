"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import type { StepClip } from "@/content/media";

export interface ExplainerStep {
  title: string;
  body: string;
}

interface ExplainerProps {
  steps: readonly ExplainerStep[];
  /** One drawing per step (the contents of a 400 x 344 SVG; see CoachingScenes). */
  scenes?: readonly ReactNode[];
  /** One live-action loop per step, shown instead of the drawings (content/media.ts). */
  clips?: readonly StepClip[];
  /** Advance by itself (with a pause button). Off: the scenes change only when chosen. */
  autoPlay?: boolean;
  /** What a segment is called to a screen reader, e.g. "step". */
  noun?: string;
}

const REDUCE = "(prefers-reduced-motion: reduce)";
const subscribeReduce = (onChange: () => void) => {
  const mq = window.matchMedia(REDUCE);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
};
const prefersReduce = () => window.matchMedia(REDUCE).matches;

const escapeAttr = (value: string) => value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

/**
 * A step's footage. Written as HTML so `autoplay muted loop playsinline` are in the
 * markup (React does not render the `muted` attribute autoplay needs; see HeroVideo).
 * The poster sits behind it, so a still shows while it loads, if it cannot play,
 * and with Reduce Motion, where it starts paused until the visitor presses play.
 */
function ClipStage({ clip, paused }: { clip: StepClip; paused: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const v = ref.current?.querySelector("video");
    if (!v) return;
    v.muted = true;
    if (paused) v.pause();
    else v.play().catch(() => {});
  }, [paused, clip]);
  const html =
    `<video autoplay muted loop playsinline preload="auto" tabindex="-1" poster="${escapeAttr(clip.poster)}" class="mx-video">` +
    clip.sources.map((s) => `<source src="${escapeAttr(s.src)}" type="${escapeAttr(s.type)}">`).join("") +
    "</video>";
  return (
    <div className="mx-clip" style={{ backgroundImage: `url("${clip.poster}")` }}>
      <div ref={ref} className="mx-clip-play" dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}

/**
 * A short, tap-through explainer in the memberships page's style: one drawing
 * (or, with `clips`, one live-action loop) at a time on a ruled stage, the step's words beneath, and a segmented bar that
 * fills as each step shows and doubles as the step picker. Motion and auto-advance
 * only without reduced motion (globals.css `.mx-*`); a pause button whenever it
 * moves by itself (WCAG 2.2.2). The stage and caption are decorative: the page
 * also holds the same words as plain text for screen readers. All words come from
 * the page's own content, so the drawing can never say more than the page does.
 */
export function Explainer({ steps, scenes, clips, autoPlay = true, noun = "step" }: ExplainerProps) {
  const [current, setCurrent] = useState(0);
  // null until the visitor presses pause or play. With Reduce Motion footage starts paused; the button still starts it.
  const [pausedChoice, setPausedChoice] = useState<boolean | null>(null);
  const reduce = useSyncExternalStore(subscribeReduce, prefersReduce, () => false);
  const paused = pausedChoice ?? (Boolean(clips) && reduce);
  const setPaused = (update: (p: boolean) => boolean) => setPausedChoice(update(paused));
  // Footage moves even when the steps don't advance by themselves, so it gets the pause button too (WCAG 2.2.2).
  const moving = autoPlay || Boolean(clips);
  const next = () => setCurrent((c) => (c + 1) % steps.length);

  return (
    <div className="mx" data-paused={paused || undefined} data-played={pausedChoice === false || undefined}>
      <div className="mx-stage" aria-hidden="true">
        {clips ? (
          <ClipStage key={current} clip={clips[current]} paused={paused} />
        ) : (
          /* key restarts the scene's animations each time it is shown */
          <svg key={current} viewBox="0 0 400 344" className="mx-scene">
            {scenes?.[current]}
          </svg>
        )}
      </div>

      <p className="mx-caption" aria-hidden="true">
        <span className="font-semibold tabular-nums">
          {current + 1} / {steps.length}
        </span>
        <span key={current} className="mx-swap">
          <span className="block font-semibold">{steps[current].title}</span>
          <span className="mt-1 block text-base font-normal lg:text-lg">{steps[current].body}</span>
        </span>
      </p>

      <div className="mt-6 flex max-w-[32.5rem] items-center gap-4">
        {moving ? (
          <button
            type="button"
            onClick={() => setPaused((p) => !p)}
            aria-pressed={paused}
            aria-label={paused ? (clips ? "Play video" : "Play animation") : clips ? "Pause video" : "Pause animation"}
            className="mx-pause grid size-11 shrink-0 place-items-center border-[1.5px] border-ink bg-paper text-ink hover:bg-ink hover:text-paper"
          >
            <svg viewBox="0 0 16 16" className="size-4 fill-current" aria-hidden="true">
              <path d={paused ? "M4 2l10 6-10 6z" : "M3 2h4v12H3zM9 2h4v12H9z"} />
            </svg>
          </button>
        ) : null}
        <div className="grid min-w-0 flex-1 gap-1.5" style={{ gridTemplateColumns: `repeat(${steps.length}, 1fr)` }}>
          {steps.map((step, i) => (
            <button
              key={step.title}
              type="button"
              onClick={() => setCurrent(i)}
              aria-label={`Show ${noun} ${i + 1} of ${steps.length}: ${step.title}`}
              aria-current={i === current ? "step" : undefined}
              className="mx-seg"
            >
              <span className="mx-track">
                <i
                  key={i === current ? `cur-${current}` : "idle"}
                  className={autoPlay ? (i < current ? "mx-fill mx-done" : i === current ? "mx-fill mx-cur" : "mx-fill") : i <= current ? "mx-fill mx-done" : "mx-fill"}
                  onAnimationEnd={() => {
                    if (autoPlay && !paused && i === current) next();
                  }}
                />
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
