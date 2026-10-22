import Link from "next/link";
import { cn } from "@/lib/cn";

interface StartTrainingProps {
  href: string;
  label: string;
  /** Read after the label by screen readers only, e.g. " (1:1 coaching)". */
  srSuffix?: string;
  external?: boolean;
  /** "bar": the full-size button on the pages. "button": the compact one in the header (no arrow). */
  variant?: "bar" | "button";
  className?: string;
}

/**
 * The main booking call to action: a plain link, so a tap, click or Enter goes
 * straight to the destination and it works without JavaScript. Black bar,
 * white arrow square; hover inverts.
 */
export function StartTraining({ href, label, srSuffix, external = false, variant = "bar", className }: StartTrainingProps) {
  const large = variant === "bar";
  return (
    <Link
      href={href}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className={cn(
        "group inline-flex items-center justify-between gap-3 rounded-md border border-ink bg-ink p-1 text-sm font-semibold uppercase tracking-[0.08em] text-white transition-colors duration-200 hover:bg-white hover:text-ink active:translate-y-px",
        large ? "min-h-14" : "min-h-11 lg:min-h-12",
        className,
      )}
    >
      <span className={cn("flex-1", large ? "pl-5 text-left" : "whitespace-nowrap px-3 text-center text-xs sm:px-4 sm:text-sm lg:px-6")}>
        {label}
        {srSuffix ? <span className="sr-only">{srSuffix}</span> : null}
      </span>
      {large ? (
        <span
          aria-hidden="true"
          className="flex w-12 items-center justify-center self-stretch rounded bg-white text-ink group-hover:bg-ink group-hover:text-white"
        >
          <svg viewBox="0 0 16 16" className="size-4 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M1 8h13M9 3l5 5-5 5" />
          </svg>
        </span>
      ) : null}
      {external ? <span className="sr-only"> (opens in a new tab)</span> : null}
    </Link>
  );
}
