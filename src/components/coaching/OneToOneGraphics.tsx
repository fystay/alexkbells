import { Fragment, type ReactNode } from "react";

/*
 * Line drawings for /coaching (owner's design, 2026-10-28): "two points, one
 * line" for you and Alex. Thin ink strokes (`.ln` in globals.css) that draw in
 * as their data-reveal block scrolls into view. All decorative (aria-hidden).
 */

/** You and Alex, joined by one line. */
export function Duo({ className }: { className?: string }) {
  return (
    <div data-reveal className={className}>
      <svg viewBox="0 0 600 130" aria-hidden="true" className="h-auto w-full overflow-visible">
        <path className="ln ln-faint" pathLength={1} d="M20 90 H580" />
        <path className="ln" pathLength={1} d="M150 56 C250 6 350 6 450 56" />
        <circle cx="150" cy="56" r="16" className="fill-paper stroke-ink" strokeWidth={2} />
        <circle cx="450" cy="56" r="16" className="fill-ink" />
        <text x="150" y="124" textAnchor="middle" className="fill-ink text-[18px] font-semibold tracking-[0.2em]">
          YOU
        </text>
        <text x="450" y="124" textAnchor="middle" className="fill-ink text-[18px] font-semibold tracking-[0.2em]">
          ALEX
        </text>
      </svg>
    </div>
  );
}

/** Who it's for, in order: strength, technique, movement. */
export const focusIcons: ReactNode[] = [
  <Fragment key="stairs">
    <path className="ln" pathLength={1} d="M6 36 H14 V28 H22 V20 H30 V12 H38" />
    <path className="ln ln-faint" pathLength={1} d="M33 8 L38 12 L33 16" />
  </Fragment>,
  <Fragment key="eye">
    <path className="ln" pathLength={1} d="M4 22 Q22 6 40 22 Q22 38 4 22 Z" />
    <circle className="fill-ink" cx="22" cy="22" r="5" />
  </Fragment>,
  <Fragment key="pendulum">
    <path className="ln ln-faint" pathLength={1} d="M8 20 Q22 44 36 20" />
    <path className="ln" pathLength={1} d="M22 4 L22 30" />
    <circle className="fill-ink" cx="22" cy="33" r="4.5" />
  </Fragment>,
];

/** How it works, in order: a message, a tick, a kettlebell. */
export const howIcons: ReactNode[] = [
  <path key="message" className="ln" pathLength={1} d="M3 4 H19 V15 H9 L5 19 V15 H3 Z" />,
  <path key="tick" className="ln" pathLength={1} d="M4 11.5 L9 16 L18 6" />,
  <Fragment key="kettlebell">
    <path className="ln" pathLength={1} d="M7 8 V5 Q7 3 9 3 H13 Q15 3 15 5 V8" />
    <path className="ln" pathLength={1} d="M11 7.5 C16.5 7.5 19 10.5 19 14 C19 17.5 16 19.5 11 19.5 C6 19.5 3 17.5 3 14 C3 10.5 5.5 7.5 11 7.5 Z" />
  </Fragment>,
];
