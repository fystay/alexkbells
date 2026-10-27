"use client";

import { useState, type ReactNode } from "react";

export interface ExplainerStep {
  title: string;
  body: string;
}

interface ExplainerProps {
  steps: readonly ExplainerStep[];
  /** One drawing per step (the contents of a 400 x 344 SVG; see CoachingScenes). */
  scenes: readonly ReactNode[];
  /** Advance by itself (with a pause button). Off: the scenes change only when chosen. */
  autoPlay?: boolean;
  /** What a segment is called to a screen reader, e.g. "step". */
  noun?: string;
}

/**
 * A short, tap-through explainer in the memberships page's style: one drawing
 * at a time on a ruled stage, the step's words beneath, and a segmented bar that
 * fills as each step shows and doubles as the step picker. Motion and auto-advance
 * only without reduced motion (globals.css `.mx-*`); a pause button whenever it
 * moves by itself (WCAG 2.2.2). The stage and caption are decorative: the page
 * also holds the same words as plain text for screen readers. All words come from
 * the page's own content, so the drawing can never say more than the page does.
 */
export function Explainer({ steps, scenes, autoPlay = true, noun = "step" }: ExplainerProps) {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const next = () => setCurrent((c) => (c + 1) % steps.length);

  return (
    <div className="mx" data-paused={paused || undefined}>
      <div className="mx-stage" aria-hidden="true">
        {/* key restarts the scene's animations each time it is shown */}
        <svg key={current} viewBox="0 0 400 344" className="mx-scene">
          {scenes[current]}
        </svg>
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
        {autoPlay ? (
          <button
            type="button"
            onClick={() => setPaused((p) => !p)}
            aria-pressed={paused}
            aria-label={paused ? "Play animation" : "Pause animation"}
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
