import Link from "next/link";
import { cn } from "@/lib/cn";

interface StartTrainingProps {
  href: string;
  label: string;
  /** Read after the label by screen readers only, e.g. " (1:1 coaching)". */
  srSuffix?: string;
  external?: boolean;
  /** "bar": the full-size button on the pages. "button": the compact one in the header (ink outline box and ink text on the light header). */
  variant?: "bar" | "button";
  /** Over the dark film: white button, ink text. */
  onDark?: boolean;
  className?: string;
}

/**
 * The main booking call to action: a plain link, so a tap, click or Enter goes
 * straight to the destination and it works without JavaScript. Black bar,
 * hover inverts. No arrow.
 */
export function StartTraining({ href, label, srSuffix, external = false, variant = "bar", onDark = false, className }: StartTrainingProps) {
  const large = variant === "bar";
  return (
    <Link
      href={href}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className={cn(
        "group inline-flex items-center justify-center gap-3 rounded-md p-1 text-sm font-semibold uppercase tracking-[0.08em] transition-colors duration-200 active:translate-y-px",
        large
          ? onDark
            ? "min-h-14 border border-white bg-white text-ink hover:bg-transparent hover:text-white"
            : "min-h-14 border border-ink bg-ink text-white hover:bg-white hover:text-ink"
          : "min-h-11 border-[1.5px] border-ink bg-transparent text-ink hover:bg-ink hover:text-paper lg:min-h-12",
        className,
      )}
    >
      <span className={cn("px-5 text-center", !large && "whitespace-nowrap px-3 text-xs sm:px-4 sm:text-sm lg:px-6")}>
        {label}
        {srSuffix ? <span className="sr-only">{srSuffix}</span> : null}
      </span>
      {external ? <span className="sr-only"> (opens in a new tab)</span> : null}
    </Link>
  );
}
