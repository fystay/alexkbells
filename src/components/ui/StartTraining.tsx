import Link from "next/link";
import { cn } from "@/lib/cn";

type Tone = "light" | "dark";

interface StartTrainingProps {
  href: string;
  label: string;
  /** Read after the label by screen readers only, e.g. " with online coaching". */
  srSuffix?: string;
  external?: boolean;
  /** The surface it sits on: "dark" draws a paper bar with an ink arrow square. */
  tone?: Tone;
  /** "bar": the full-size button on the pages. "button": the compact one in the header. */
  variant?: "bar" | "button";
  className?: string;
  /** Extra classes for the arrow square (e.g. responsive tone overrides). */
  handleClassName?: string;
}

const bar: Record<Tone, string> = {
  light: "bg-ink text-paper focus-visible:outline-ink",
  dark: "bg-paper text-ink focus-visible:outline-paper",
};
const square: Record<Tone, string> = {
  light: "bg-paper text-ink",
  dark: "bg-ink text-paper",
};

/**
 * "Start your training": a plain link straight to the booking page (or
 * wherever the call to action points). A tap, click or Enter goes there at
 * once: no swipe and no intro screen (removed 2026-10-21 at the owner's
 * request). Works without JavaScript.
 */
export function StartTraining({ href, label, srSuffix, external = false, tone = "dark", variant = "bar", className, handleClassName }: StartTrainingProps) {
  const large = variant === "bar";
  return (
    <Link
      href={href}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className={cn(
        "group inline-flex items-center justify-between gap-3 p-1 text-sm font-semibold uppercase tracking-[0.08em] transition-colors duration-200 active:translate-y-px",
        large ? "min-h-14" : "min-h-11",
        bar[tone],
        className,
      )}
    >
      <span className={cn("flex-1 text-left", large ? "pl-5" : "pl-4")}>
        {label}
        {srSuffix ? <span className="sr-only">{srSuffix}</span> : null}
      </span>
      <span aria-hidden="true" className={cn("flex items-center justify-center self-stretch", large ? "w-12" : "w-9", square[tone], handleClassName)}>
        <svg viewBox="0 0 16 16" className="size-4 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M1 8h13M9 3l5 5-5 5" />
        </svg>
      </span>
      {external ? <span className="sr-only"> (opens in a new tab)</span> : null}
    </Link>
  );
}
