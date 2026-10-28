"use client";

import { useEffect, useRef, useState } from "react";

const X0 = 20;
const X1 = 540;
const BASE = 175;
const TOP = 30;
const MAX = Math.pow(1.01, 365);
const xAt = (day: number) => X0 + ((X1 - X0) * (day - 1)) / 364;
const yAt = (day: number) => BASE - ((BASE - TOP) * (Math.pow(1.01, day) - 1)) / (MAX - 1);
const CURVE = Array.from({ length: 74 }, (_, i) => Math.min(365, 1 + i * 5))
  .map((day, i) => `${i ? "L" : "M"}${xAt(day).toFixed(1)} ${yAt(day).toFixed(1)}`)
  .join("");
const times = (day: number) => {
  const v = Math.pow(1.01, day);
  return `×${v < 10 ? v.toFixed(2) : v.toFixed(1)}`;
};

/**
 * "1% better, every day" as a chart (owner's /about design, 2026-10-28):
 * 1.01 to the power of the day, against no change, over a year. Drag across
 * the chart or use the slider to read any day; on first view the reading
 * sweeps along as the line draws in (not with Reduce Motion). Arithmetic
 * only: 1.01^365 ≈ 37.8.
 */
export function CompoundChart({ className }: { className?: string }) {
  const [day, setDay] = useState(365);
  const svg = useRef<SVGSVGElement>(null);
  const down = useRef(false);

  // Sweep once when the chart scrolls into view.
  useEffect(() => {
    const el = svg.current;
    if (!el || !("IntersectionObserver" in window) || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        io.disconnect();
        const start = performance.now() + 150;
        const tick = (t: number) => {
          const p = Math.min(1, Math.max(0, (t - start) / 1200));
          setDay(Math.round(1 + 364 * (1 - Math.pow(1 - p, 3))));
          if (p < 1) frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(frame);
    };
  }, []);

  const fromPointer = (clientX: number) => {
    const r = svg.current?.getBoundingClientRect();
    if (!r) return;
    const px = ((clientX - r.left) / r.width) * 560;
    setDay(Math.max(1, Math.min(365, Math.round(1 + ((px - X0) / (X1 - X0)) * 364))));
  };

  const x = xAt(day);
  const y = yAt(day);
  return (
    <div className={className}>
      <svg
        ref={svg}
        viewBox="0 0 560 210"
        role="img"
        aria-label="Improving 1% a day for a year compounds to about 37.8 times where you started"
        className="h-auto w-full cursor-ew-resize touch-pan-y select-none"
        onPointerDown={(e) => {
          down.current = true;
          fromPointer(e.clientX);
        }}
        onPointerMove={(e) => {
          if (down.current || e.pointerType === "mouse") fromPointer(e.clientX);
        }}
        onPointerUp={() => (down.current = false)}
        onPointerLeave={() => (down.current = false)}
      >
        <line x1="20" y1="180" x2="540" y2="180" className="stroke-line" strokeWidth={1} />
        <path d="M20 175 H540" fill="none" className="stroke-line" strokeWidth={1.5} strokeDasharray="4 5" />
        <path className="ln" pathLength={1} d={CURVE} />
        <line x1={x} y1="20" x2={x} y2="180" className="stroke-ink" strokeWidth={1} strokeDasharray="2 4" />
        <circle cx={x} cy={y} r="9" className="fill-paper stroke-ink" strokeWidth={1.5} />
        <circle cx={x} cy={y} r="4" className="fill-ink" />
        <text x="20" y="202" className="fill-ink text-[13px] tabular-nums">
          Day 1
        </text>
        <text x="540" y="202" textAnchor="end" className="fill-ink text-[13px] tabular-nums">
          Day 365
        </text>
        <text x="530" y="166" textAnchor="end" className="fill-ink text-[13px]">
          No change
        </text>
      </svg>
      <p className="mt-3 flex flex-wrap items-baseline gap-x-4 tabular-nums">
        <strong className="font-display text-[2.125rem] leading-none font-bold tracking-tight">{times(day)}</strong>
        <span className="text-sm">
          after {day} {day === 1 ? "day" : "days"} of 1% better
        </span>
      </p>
      <label className="mt-2 flex items-center gap-3.5 text-[0.8125rem]">
        <span aria-hidden="true">Day 1</span>
        <input
          type="range"
          min={1}
          max={365}
          value={day}
          onChange={(e) => setDay(Number(e.target.value))}
          aria-label="Day of the year"
          aria-valuetext={`Day ${day}: ${times(day)}`}
          className="h-11 min-w-0 flex-1 accent-ink"
        />
        <span aria-hidden="true">365</span>
      </label>
    </div>
  );
}
