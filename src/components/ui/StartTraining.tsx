import Link from "next/link";
import { cn } from "@/lib/cn";

interface StartTrainingProps {
  href: string;
  label: string;
  /** Read after the label by screen readers only, e.g. " (1:1 coaching)". */
  srSuffix?: string;
  external?: boolean;
  /** "bar": the full-size pill on the pages. "button": the compact pill in the header. */
  variant?: "bar" | "button";
  /** Over the dark film: white button, ink text. */
  onDark?: boolean;
  /** Marks the link as the current section (aria-current="page"). */
  current?: boolean;
  className?: string;
}

/**
 * The main booking call to action: a plain link, so a tap, click or Enter goes
 * straight to the destination and it works without JavaScript. A black pill,
 * hover inverts. No arrow.
 */
export function StartTraining({ href, label, srSuffix, external = false, variant = "bar", onDark = false, current = false, className }: StartTrainingProps) {
  const large = variant === "bar";
  return (
    <Link
      href={href}
      aria-current={current ? "page" : undefined}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className={cn(
        large && onDark
          ? // The production hero's white button (owner, 2026-10-26: keep the live hero as it is). Only the hero uses onDark.
            "group inline-flex min-h-14 items-center justify-center gap-3 rounded-md border border-white bg-white p-1 text-sm font-semibold tracking-[0.08em] text-ink uppercase transition-colors duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] hover:bg-transparent hover:text-white active:translate-y-px"
          : cn(
              "group inline-flex items-center justify-center gap-3 rounded-full border font-semibold transition-colors duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] active:translate-y-px",
              large
                ? "min-h-14 border-ink bg-ink px-2 text-base text-white hover:bg-white hover:text-ink"
                : current
                  ? "min-h-11 border-ink bg-white px-4 text-sm text-ink sm:px-5"
                  : "min-h-11 border-ink bg-ink px-4 text-sm text-white hover:bg-white hover:text-ink sm:px-5",
            ),
        className,
      )}
    >
      <span className={cn("text-center", large ? "px-5" : "whitespace-nowrap")}>
        {label}
        {srSuffix ? <span className="sr-only">{srSuffix}</span> : null}
      </span>
      {external ? <span className="sr-only"> (opens in a new tab)</span> : null}
    </Link>
  );
}
