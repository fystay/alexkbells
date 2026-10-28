import { Fragment, type ReactNode } from "react";

/*
 * Line drawings for /online-coaching (owner's design, 2026-10-28): thin ink
 * strokes (`.ln` in globals.css) that draw in as their data-reveal block
 * scrolls into view. All decorative (aria-hidden); the text says it all.
 */

/** Signal arcs from the studio out to wherever you train. */
export function Reach({ className }: { className?: string }) {
  return (
    <div data-reveal className={className}>
      <svg viewBox="0 0 600 150" aria-hidden="true" className="h-auto w-full overflow-visible">
        <path className="ln ln-faint" pathLength={1} d="M90 75 C200 0 330 10 430 38" />
        <path className="ln ln-faint" pathLength={1} d="M90 75 C220 70 360 80 520 88" />
        <path className="ln ln-faint" pathLength={1} d="M90 75 C190 150 330 140 400 122" />
        <path className="ln" pathLength={1} d="M66 75 A24 24 0 0 1 114 75" />
        <circle className="fill-ink" cx="90" cy="75" r="10" />
        {[
          [430, 38],
          [520, 88],
          [400, 122],
        ].map(([cx, cy]) => (
          <circle key={cx} cx={cx} cy={cy} r="8" className="fill-paper stroke-ink" strokeWidth={2} />
        ))}
        <text x="90" y="118" textAnchor="middle" className="fill-ink text-[18px] font-semibold tracking-[0.2em]">
          STUDIO
        </text>
        <text x="598" y="70" textAnchor="end" className="fill-ink text-[18px] font-semibold tracking-[0.2em]">
          YOU, WHEREVER
        </text>
      </svg>
    </div>
  );
}

/** What you get, in order: programming, support, progression. */
export const featureIcons: ReactNode[] = [
  <Fragment key="plan">
    <path className="ln" pathLength={1} d="M10 4 H30 L36 10 V40 H10 Z" />
    <path className="ln ln-faint" pathLength={1} d="M16 18 H30 M16 25 H30 M16 32 H24" />
  </Fragment>,
  <Fragment key="chat">
    <path className="ln" pathLength={1} d="M4 8 H26 V22 H12 L7 27 V22 H4 Z" />
    <path className="ln" pathLength={1} d="M18 26 V30 H32 L37 35 V30 H40 V16 H30" />
  </Fragment>,
  <Fragment key="progress">
    <path className="ln ln-faint" pathLength={1} d="M4 40 H40" />
    <path className="ln" pathLength={1} d="M6 34 L16 26 L24 29 L38 10" />
    <circle className="fill-ink" cx="38" cy="10" r="3.5" />
  </Fragment>,
];

/** How it works, in order: tell Alex, Alex reviews, decide together. */
export const stepIcons: ReactNode[] = [
  <Fragment key="form">
    <path className="ln" pathLength={1} d="M5 3 H17 V19 H5 Z" />
    <path className="ln ln-faint" pathLength={1} d="M8 8 H14 M8 12 H14 M8 16 H11" />
  </Fragment>,
  <Fragment key="eye">
    <path className="ln" pathLength={1} d="M2 11 Q11 3 20 11 Q11 19 2 11 Z" />
    <circle className="fill-ink" cx="11" cy="11" r="2.8" />
  </Fragment>,
  <path key="tick" className="ln" pathLength={1} d="M4 11.5 L9 16 L18 6" />,
];

/** A month as a full circle, for the price. */
export function MonthRing({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 96 96" aria-hidden="true" className={className}>
      <circle className="ln ln-faint" pathLength={1} cx="48" cy="48" r="40" />
      <path className="ln" pathLength={1} d="M48 8 A40 40 0 1 1 47.9 8" />
      <circle className="fill-ink" cx="48" cy="8" r="4" />
      <text x="48" y="53" textAnchor="middle" className="fill-ink text-[12px] font-semibold tracking-[0.13em]">
        MONTH
      </text>
    </svg>
  );
}
