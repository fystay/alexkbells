"use client";

import { useRef, useState, useSyncExternalStore, type KeyboardEvent, type ReactNode } from "react";

const subscribe = () => () => {};

/**
 * Week tabs on Book (owner's design): "This week", "Next week", then date
 * ranges, with one week's classes showing. Proper tabs (arrow keys, Home,
 * End). Before JavaScript runs every week shows, one under another.
 */
export function WeekTabs({ labels, panels, initial = 0 }: { labels: string[]; panels: ReactNode[]; initial?: number }) {
  const [current, setCurrent] = useState(initial);
  // False on the server and during hydration, true once in the browser: tabs only once they work.
  const ready = useSyncExternalStore(subscribe, () => true, () => false);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);

  const select = (i: number) => {
    setCurrent(i);
    tabs.current[i]?.focus();
  };
  const onKey = (e: KeyboardEvent) => {
    const last = labels.length - 1;
    const moves: Record<string, number> = { ArrowRight: current + 1, ArrowLeft: current - 1, Home: 0, End: last };
    const move = moves[e.key];
    if (move === undefined) return;
    e.preventDefault();
    select(Math.max(0, Math.min(last, move)));
  };

  return (
    <div className="flex flex-col gap-4">
      {ready ? (
        <div role="tablist" aria-label="Week" onKeyDown={onKey} className="-mx-1 flex gap-2 overflow-x-auto p-1 [scrollbar-width:none]">
          {labels.map((label, i) => (
            <button
              key={label}
              ref={(el) => {
                tabs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`week-tab-${i}`}
              aria-controls={`week-${i}`}
              aria-selected={i === current}
              tabIndex={i === current ? 0 : -1}
              onClick={() => setCurrent(i)}
              className={`min-h-11 flex-none rounded-full border-[1.5px] px-4 text-sm font-semibold whitespace-nowrap transition-colors ${
                i === current ? "border-ink bg-ink text-paper" : "border-line hover:border-ink"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      ) : null}
      {panels.map((panel, i) => (
        <div
          key={labels[i]}
          id={`week-${i}`}
          role={ready ? "tabpanel" : undefined}
          aria-labelledby={ready ? `week-tab-${i}` : undefined}
          hidden={ready && i !== current}
        >
          {ready ? null : <h2 className="members-eyebrow mb-3">{labels[i]}</h2>}
          {panel}
        </div>
      ))}
    </div>
  );
}
