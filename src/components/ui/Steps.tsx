import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { revealDelay } from "@/lib/reveal";

interface Step {
  title: string;
  body: ReactNode;
}

/**
 * Numbered steps, as on the home page: a number in a circle beside each step,
 * no cards (2026-10-26). Decorative numbers; the list is ordered for screen readers.
 */
export function Steps({ steps, className }: { steps: Step[]; className?: string }) {
  return (
    <ol className={cn("space-y-6", className)}>
      {steps.map((step, i) => (
        <li key={step.title} data-reveal style={revealDelay(i)} className="grid grid-cols-[2.5rem_1fr] items-start">
          <span aria-hidden="true" className="inline-flex size-7 items-center justify-center rounded-full border-[1.5px] border-ink text-sm font-bold">
            {i + 1}
          </span>
          <div>
            <h3 className="card-title">{step.title}</h3>
            <p className="mt-1">{step.body}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
