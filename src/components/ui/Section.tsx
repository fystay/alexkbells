import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** "plain" sits on the cream page; "white" is a white band for contrast. */
export type SectionTone = "plain" | "white";

const toneClasses: Record<SectionTone, string> = {
  plain: "bg-paper text-ink",
  white: "bg-white text-ink",
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
      className={cn(toneClasses[tone], spacing === "default" ? "py-12 sm:py-16 lg:py-20" : "py-8 sm:py-12", className)}
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
      {eyebrow ? <p className="eyebrow mb-4">{eyebrow}</p> : null}
      <Heading id={id} className={cn("font-display text-balance", Heading === "h1" ? "text-h1" : "text-h2")}>
        {title}
      </Heading>
      {intro ? <div className="mt-5 max-w-xl text-lede">{intro}</div> : null}
    </div>
  );
}
