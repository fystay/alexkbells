import Link from "next/link";
import { cn } from "@/lib/cn";

interface StartTrainingProps {
  href: string;
  label: string;
  /** Read after the label by screen readers only, e.g. " (1:1 coaching)". */
  srSuffix?: string;
  external?: boolean;
  /** "bar": the full-size button on the pages. "button": the compact one in the header (just the words in ink; underlined on hover). */
  variant?: "bar" | "button";
  /** Over the dark film: white button, ink text. */
  onDark?: boolean;
  /** Marks the link as the current section (aria-current="page"). */
  current?: boolean;
  className?: string;
}

/**
 * The main booking call to action: a plain link, so a tap, click or Enter goes
 * straight to the destination and it works without JavaScript. Black bar,
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
        "group inline-flex items-center justify-center gap-3 rounded-md text-sm font-semibold uppercase tracking-[0.08em] transition-colors duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] active:translate-y-px",
        large && "p-1",
        large
          ? onDark
            ? "min-h-14 border border-white bg-white text-ink hover:bg-transparent hover:text-white"
            : "min-h-14 border border-ink bg-ink text-white hover:bg-white hover:text-ink"
          : "mr-[3.5px] min-h-11 bg-transparent text-ink underline-offset-8 hover:underline lg:min-h-12",
        className,
      )}
    >
      <span className={cn("text-center", large ? "px-5" : "whitespace-nowrap text-xs sm:text-sm")}>
        {label}
        {srSuffix ? <span className="sr-only">{srSuffix}</span> : null}
      </span>
      {external ? <span className="sr-only"> (opens in a new tab)</span> : null}
    </Link>
  );
}
