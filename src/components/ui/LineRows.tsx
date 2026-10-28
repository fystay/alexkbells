import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { revealDelay } from "@/lib/reveal";

export interface LineItem {
  title: string;
  body: ReactNode;
  /** The contents of the item's line drawing (`.ln` paths). */
  icon: ReactNode;
}

/**
 * Rows between thin rules, each with a 44 px line drawing (owner's coaching
 * designs, 2026-10-28; /coaching and /online-coaching). The drawings draw in
 * as each row scrolls into view.
 */
export function LineRows({ items, className }: { items: LineItem[]; className?: string }) {
  return (
    <ul className={cn("border-t border-line", className)}>
      {items.map((item, i) => (
        <li key={item.title} data-reveal style={revealDelay(i)} className="grid grid-cols-[2.75rem_1fr] gap-4 border-b border-line py-5">
          <svg viewBox="0 0 44 44" aria-hidden="true" className="size-11">
            {item.icon}
          </svg>
          <div className="min-w-0">
            <h3 className="font-bold">{item.title}</h3>
            <p className="mt-1">{item.body}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

/**
 * Numbered steps on a rail (owner's coaching designs, 2026-10-28): a circle
 * with a 22 px line drawing, 01, 02, 03, the title and the text; a thin line
 * joins the circles.
 */
export function RailSteps({ items, className }: { items: LineItem[]; className?: string }) {
  return (
    <ol className={className}>
      {items.map((step, i) => {
        const last = i === items.length - 1;
        return (
          <li key={step.title} data-reveal style={revealDelay(i)} className={cn("relative grid grid-cols-[2.75rem_1fr] gap-4", !last && "pb-8")}>
            {last ? null : <span aria-hidden="true" className="absolute top-12 bottom-1 left-[1.34rem] w-px bg-line" />}
            <span aria-hidden="true" className="relative grid size-11 place-items-center rounded-full border-[1.5px] border-ink bg-paper">
              <svg viewBox="0 0 22 22" className="size-[1.375rem]">
                {step.icon}
              </svg>
            </span>
            <div className="min-w-0 pt-2">
              <span className="block text-xs font-semibold tracking-[0.2em] tabular-nums">{String(i + 1).padStart(2, "0")}</span>
              <h3 className="mt-1 font-bold">{step.title}</h3>
              <p className="mt-1">{step.body}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
