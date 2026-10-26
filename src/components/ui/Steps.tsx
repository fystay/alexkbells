import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { revealDelay } from "@/lib/reveal";

interface Step {
  title: string;
  body: ReactNode;
}

/** Numbered steps, one white card each. Decorative numbers; the list is ordered for screen readers. */
export function Steps({ steps, className }: { steps: Step[]; className?: string }) {
  return (
    <ol className={cn("grid grid-cols-1 gap-3", className)}>
      {steps.map((step, i) => (
        <li key={step.title} data-reveal style={revealDelay(i)} className="card grid grid-cols-[2rem_1fr] gap-x-3 px-5 py-5 sm:px-6">
          <span className="pt-0.5 text-lg font-semibold tabular-nums" aria-hidden="true">
            {i + 1}
          </span>
          <div>
            <h3 className="text-lg font-semibold">{step.title}</h3>
            <p className="mt-1">{step.body}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
