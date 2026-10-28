import { Fragment, type ReactNode } from "react";
import { whyKettlebells } from "@/content/home";
import { Section } from "@/components/ui/Section";

// Line drawings for the three, in order (owner's classes design, 2026-10-28).
const ICONS: ReactNode[] = [
  <Fragment key="kettlebell">
    <path className="ln" pathLength={1} d="M14 13 V9 Q14 5 18 5 H22 Q26 5 26 9 V13" />
    <path className="ln" pathLength={1} d="M20 12 C30 12 35 18 35 25 C35 32 29 36 20 36 C11 36 5 32 5 25 C5 18 10 12 20 12 Z" />
  </Fragment>,
  <path key="pulse" className="ln" pathLength={1} d="M3 22 H11 L15 12 L21 30 L25 18 L28 22 H37" />,
  <Fragment key="pendulum">
    <path className="ln ln-faint" pathLength={1} d="M6 18 Q20 40 34 18" />
    <path className="ln" pathLength={1} d="M20 4 L20 28" />
    <circle className="fill-ink" cx="20" cy="31" r="4" />
  </Fragment>,
];

/**
 * What the classes build, straight under the hero (owner's classes design,
 * 2026-10-28): three columns between thin rules (stacked below 381 px, where
 * the words don't fit side by side), each with a
 * line drawing that draws in as it scrolls into view, its name and its line
 * from the home page's Why kettlebells (content/home.ts).
 */
export function ClassFocus() {
  const focus = whyKettlebells.slice(0, 3);
  return (
    <Section spacing="compact" labelledBy="focus-heading" className="pb-0 sm:pb-0">
      <h2 id="focus-heading" className="eyebrow">
        What the classes build
      </h2>
      <ul data-reveal className="mt-5 grid grid-cols-1 border-t border-line min-[381px]:grid-cols-3">
        {focus.map((f, i) => (
          <li key={f.title} className="flex min-w-0 flex-col gap-2.5 py-5 [&+&]:border-line max-[380px]:[&+&]:border-t min-[381px]:pr-3 min-[381px]:[&+&]:border-l min-[381px]:[&+&]:pl-3 sm:pr-6 sm:[&+&]:pl-6">
            <svg viewBox="0 0 40 40" aria-hidden="true" className="size-10">
              {ICONS[i]}
            </svg>
            <p className="font-display text-base leading-tight font-bold sm:text-h3">{f.title}</p>
            <p className="text-sm leading-snug sm:text-base">{f.body}</p>
          </li>
        ))}
      </ul>
    </Section>
  );
}
