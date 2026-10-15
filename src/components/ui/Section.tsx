import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type SectionTone = "paper" | "surface" | "ink";

const toneClasses: Record<SectionTone, string> = {
  paper: "bg-paper text-ink",
  surface: "bg-surface text-ink",
  ink: "bg-ink text-paper",
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

export function Section({
  children,
  tone = "paper",
  id,
  labelledBy,
  className,
  spacing = "default",
}: SectionProps) {
  return (
    <section
      id={id}
      aria-labelledby={labelledBy}
      className={cn(
        toneClasses[tone],
        spacing === "default" ? "py-16 sm:py-24 lg:py-28" : "py-10 sm:py-14",
        className,
      )}
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
  tone?: SectionTone;
  as?: "h1" | "h2";
  className?: string;
}

export function SectionHeading({
  id,
  eyebrow,
  title,
  intro,
  tone = "paper",
  as: Heading = "h2",
  className,
}: SectionHeadingProps) {
  const muted = tone === "ink" ? "text-muted-inverse" : "text-muted";
  return (
    <div className={cn("max-w-3xl", className)}>
      {eyebrow ? <p className={cn("eyebrow mb-4", muted)}>{eyebrow}</p> : null}
      <Heading
        id={id}
        className={cn("font-display text-balance", Heading === "h1" ? "text-h1" : "text-h2")}
      >
        {title}
      </Heading>
      {intro ? <div className={cn("mt-5 max-w-2xl text-lede", muted)}>{intro}</div> : null}
    </div>
  );
}
