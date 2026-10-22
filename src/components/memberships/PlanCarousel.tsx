"use client";

import { Children, useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

const two = (n: number) => String(n).padStart(2, "0");

/**
 * The membership cards as a row you swipe sideways on phones and tablets (one
 * card with the next peeking in, a "01 / 04" counter, segmented progress and
 * Previous / Next), and a plain grid from lg. The cards are server-rendered
 * children; this only handles the scrolling and the counter.
 */
export function PlanCarousel({ label, children }: { label: string; children: ReactNode }) {
  const items = Children.toArray(children);
  const count = items.length;
  const listRef = useRef<HTMLUListElement>(null);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const onScroll = () => {
      const max = list.scrollWidth - list.clientWidth;
      if (max <= 0) return setIndex(0);
      setIndex(Math.min(count - 1, Math.max(0, Math.round((list.scrollLeft / max) * (count - 1)))));
    };
    list.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => list.removeEventListener("scroll", onScroll);
  }, [count]);

  const go = (to: number) => {
    const target = listRef.current?.children[Math.min(count - 1, Math.max(0, to))] as HTMLElement | undefined;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    target?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", inline: "start", block: "nearest" });
  };

  const step = "inline-flex min-h-11 items-center px-3 text-sm font-semibold uppercase tracking-[0.08em] disabled:text-grey";

  return (
    <div>
      <ul
        ref={listRef}
        aria-label={label}
        // A sideways-scrolling region must be reachable by keyboard (arrow keys scroll it once focused).
        tabIndex={0}
        className="relative focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6 lg:mx-0 lg:grid lg:grid-cols-4 lg:gap-5 lg:overflow-visible lg:px-0 lg:pb-0"
      >
        {items}
      </ul>
      <div className="mt-4 flex items-center gap-4 lg:hidden">
        <p className="text-sm font-semibold tabular-nums" aria-live="polite">
          {two(index + 1)} / {two(count)}
        </p>
        <div aria-hidden="true" className="flex flex-1 gap-1.5">
          {items.map((_, i) => (
            <span key={i} className={cn("h-0.5 flex-1", i === index ? "bg-ink" : "bg-grey")} />
          ))}
        </div>
        <button type="button" onClick={() => go(index - 1)} disabled={index === 0} className={step}>
          Previous
        </button>
        <button type="button" onClick={() => go(index + 1)} disabled={index === count - 1} className={step}>
          Next
        </button>
      </div>
    </div>
  );
}
