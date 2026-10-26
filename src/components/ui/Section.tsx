import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { TitleBar } from "./TitleBar";

/**
 * Warm tech (owner's pick C, 2026-10-26): one cream page, sections separated by
 * space, white rounded cards carry the contrast. "white" is kept so pages that
 * alternated tones still compile, and renders on the cream page too (white
 * cards would vanish on a white band).
 */
export type SectionTone = "plain" | "white";

const toneClasses: Record<SectionTone, string> = {
  plain: "bg-paper text-ink",
  white: "bg-paper text-ink",
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
      className={cn(toneClasses[tone], spacing === "default" ? "py-12 sm:py-24 lg:py-32" : "py-10 sm:py-14", className)}
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
      {eyebrow ? <p className="eyebrow mb-3">{eyebrow}</p> : null}
      <Heading id={id} className={cn("font-display text-balance", Heading === "h1" ? "text-h1" : "text-h2")}>
        {title}
      </Heading>
      <TitleBar />
      {intro ? <div className="mt-5 max-w-xl text-lede">{intro}</div> : null}
    </div>
  );
}
