import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface Step {
  title: string;
  body: ReactNode;
}

/** Numbered steps on hairlines. Decorative numbers; the list is ordered for screen readers. */
export function Steps({ steps, className }: { steps: Step[]; className?: string }) {
  return (
    <ol className={cn("grid grid-cols-1 gap-8", className)}>
      {steps.map((step, i) => (
        <li key={step.title} className="grid grid-cols-[2.5rem_1fr] gap-x-4 border-t border-line-inverse pt-5">
          <span className="eyebrow pt-1 text-muted-inverse" aria-hidden="true">
            {String(i + 1).padStart(2, "0")}
          </span>
          <div>
            <h3 className="text-lg font-medium">{step.title}</h3>
            <p className="mt-2 text-muted-inverse">{step.body}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
