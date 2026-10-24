import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { revealDelay } from "@/lib/reveal";

interface Step {
  title: string;
  body: ReactNode;
}

/** Numbered steps on hairlines. Decorative numbers; the list is ordered for screen readers. */
export function Steps({ steps, className }: { steps: Step[]; className?: string }) {
  return (
    <ol className={cn("grid grid-cols-1 gap-6", className)}>
      {steps.map((step, i) => (
        <li key={step.title} data-reveal style={revealDelay(i)} className="grid grid-cols-[2.5rem_1fr] gap-x-4 border-t border-grey pt-4">
          <span className="eyebrow pt-1" aria-hidden="true">
            {String(i + 1).padStart(2, "0")}
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
