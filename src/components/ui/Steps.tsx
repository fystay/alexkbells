import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface Step {
  title: string;
  body: ReactNode;
}

/** Numbered steps on hairlines. Decorative numbers; the list is ordered for screen readers. */
export function Steps({ steps, tone = "paper", className }: { steps: Step[]; tone?: "paper" | "ink"; className?: string }) {
  const ink = tone === "ink";
  return (
    <ol className={cn("grid grid-cols-1 gap-8", className)}>
      {steps.map((step, i) => (
        <li key={step.title} className={cn("grid grid-cols-[2.5rem_1fr] gap-x-4 border-t pt-5", ink ? "border-line-inverse" : "border-ink")}>
          <span className={cn("eyebrow pt-1", ink ? "text-muted-inverse" : "text-muted")} aria-hidden="true">
            {String(i + 1).padStart(2, "0")}
          </span>
          <div>
            <h3 className="text-lg font-bold">{step.title}</h3>
            <p className={cn("mt-2", ink ? "text-muted-inverse" : "text-muted")}>{step.body}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
