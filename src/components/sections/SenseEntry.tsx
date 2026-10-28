"use client";

import { useState } from "react";

/**
 * The four senses of แรง under the word (owner's /about design, 2026-10-28):
 * numbered words; tapping one underlines it and shows its line below (read
 * out politely by screen readers). The first is chosen to begin with.
 */
export function SenseEntry({ senses }: { senses: readonly { word: string; line: string }[] }) {
  const [active, setActive] = useState(0);
  return (
    <>
      <p className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5">
        {senses.map((s, i) => (
          <button
            key={s.word}
            type="button"
            aria-pressed={active === i}
            onClick={() => setActive(i)}
            className="group relative inline-flex min-h-11 items-center whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            <span className="mr-1 font-semibold tabular-nums">{i + 1}</span>
            <span className={active === i ? "" : "font-normal"}>{s.word}</span>
            <span
              aria-hidden="true"
              className={`absolute inset-x-0 bottom-2 h-[1.5px] origin-left bg-ink motion-safe:transition-transform motion-safe:duration-300 ${active === i ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"}`}
            />
          </button>
        ))}
      </p>
      <p aria-live="polite" className="min-h-[1.6em] text-[0.9375rem]">
        <span key={active} className="inline-block motion-safe:animate-[sense-in_450ms_ease-out_both]">
          {senses[active].line}
        </span>
      </p>
    </>
  );
}
