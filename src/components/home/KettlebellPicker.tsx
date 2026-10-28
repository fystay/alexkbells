"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

interface Item {
  title: string;
  body: string;
  how: string;
}

const BODY = "M500 190 C780 190 1000 300 1000 560 V700 C1000 960 780 1090 500 1090 C220 1090 0 960 0 700 V560 C0 300 220 190 500 190 Z";
const QUADS = [
  { x: 0, y: 190 },
  { x: 500, y: 190 },
  { x: 0, y: 640 },
  { x: 500, y: 640 },
];
const IDLE = "Tap a section to see how we train it.";

/**
 * The four reasons inside a line-drawn kettlebell (owner's design,
 * 2026-10-28). Each quarter is a button: tapping it fills that quarter in ink
 * and says how the classes train it underneath; tapping it again clears it.
 * When the section scrolls into view the bell draws itself, the reasons rise
 * in and the bell sways gently (globals.css `.kb-*`, only without Reduce
 * Motion; Replay draws it again). Without JavaScript everything simply shows.
 */
export function KettlebellPicker({ items, className }: { items: readonly Item[]; className?: string }) {
  const [active, setActive] = useState(-1);
  const [armed, setArmed] = useState(false);
  const [run, setRun] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // Hide the drawing until it's on screen, then play it once.
    const arm = requestAnimationFrame(() => setArmed(true));
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setRun((r) => r || 1);
          io.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => {
      cancelAnimationFrame(arm);
      io.disconnect();
    };
  }, []);

  const toggle = (i: number) => setActive((a) => (a === i ? -1 : i));
  const replay = () => {
    setActive(-1);
    setRun((r) => r + 1);
  };

  return (
    <div ref={ref} className={cn("kb", armed && "kb-armed", run > 0 && "kb-run", className)}>
      <div key={run} className={cn("kb-bell", active > -1 && "kb-paused")}>
        <svg viewBox="0 0 1000 1100" aria-hidden="true" className="absolute inset-0 size-full overflow-visible">
          <defs>
            <clipPath id="kb-body">
              <path d={BODY} />
            </clipPath>
          </defs>
          <g clipPath="url(#kb-body)">
            {QUADS.map((q, i) => (
              <rect key={i} className={cn("kb-q", active === i && "kb-q-on")} style={{ animationDelay: `${2.9 + i * 0.22}s` }} x={q.x} y={q.y} width="500" height="450" />
            ))}
          </g>
          <path className="kb-line kb-handle-o" pathLength={1} d="M320 196 V130 Q320 22 430 22 H570 Q680 22 680 130 V196" />
          <path className="kb-line kb-handle-i" pathLength={1} d="M386 193 V146 Q386 86 446 86 H554 Q614 86 614 146 V193" />
          <path className="kb-line kb-body" pathLength={1} d={BODY} />
          <line className="kb-line kb-div" pathLength={1} x1="500" y1="190" x2="500" y2="1090" />
          <line className="kb-line kb-div kb-div-h" pathLength={1} x1="0" y1="640" x2="1000" y2="640" />
        </svg>
        <div className="kb-cells">
          {items.map((item, i) => (
            <button key={item.title} type="button" className="kb-cell" aria-pressed={active === i} onClick={() => toggle(i)}>
              <span className="kb-num">{String(i + 1).padStart(2, "0")}</span>
              <span className="kb-ttl">{item.title}</span>
              <span className="kb-desc">{item.body}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="kb-caption mt-6 flex items-center justify-between gap-4 border-t border-line pt-4">
        <p aria-live="polite" className="min-w-0 text-[0.9375rem] leading-snug">
          {active > -1 ? (
            <>
              <b className="font-semibold">{items[active].title}:</b> {items[active].how}
            </>
          ) : (
            IDLE
          )}
        </p>
        <button type="button" onClick={replay} className="kb-replay inline-flex min-h-11 shrink-0 items-center rounded-full bg-ink px-4 text-[0.8125rem] font-semibold tracking-[0.08em] text-paper uppercase">
          Replay
        </button>
      </div>
    </div>
  );
}
