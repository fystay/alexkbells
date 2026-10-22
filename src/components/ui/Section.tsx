import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Sections sit on the continuous dark page surface. "plain" has no background
 * of its own; "raised" lays a barely-there cream tint over it for emphasis.
 */
export type SectionTone = "plain" | "raised";

const toneClasses: Record<SectionTone, string> = {
  plain: "",
  raised: "bg-linear-to-b from-transparent via-white to-transparent",
};

interface SectionProps {
  children: ReactNode;
  tone?: SectionTone;
  id?: string;
  labelledBy?: string;
  className?: string;
  /** Vertical rhythm. */
  spacing?: "default" | "compact";
}

export function Section({ children, tone = "plain", id, labelledBy, className, spacing = "default" }: SectionProps) {
  return (
    <section
      id={id}
      aria-labelledby={labelledBy}
      className={cn(toneClasses[tone], spacing === "default" ? "py-20 sm:py-28 lg:py-32" : "py-12 sm:py-16", className)}
    >
      <div className="container-page">{children}</div>
    </section>
  );
}

interface SectionHeadingProps {
  id: string;
  eyebrow?: string;
  title: ReactNode;
  intro?: ReactNode;
  as?: "h1" | "h2";
  className?: string;
}

export function SectionHeading({ id, eyebrow, title, intro, as: Heading = "h2", className }: SectionHeadingProps) {
  return (
    <div data-reveal className={cn("max-w-3xl", className)}>
      {eyebrow ? <p className="eyebrow mb-5 text-muted-inverse">{eyebrow}</p> : null}
      <Heading id={id} className={cn("font-display text-balance", Heading === "h1" ? "text-h1" : "text-h2")}>
        {title}
      </Heading>
      {intro ? <div className="mt-6 max-w-2xl text-lede text-muted-inverse">{intro}</div> : null}
    </div>
  );
}
