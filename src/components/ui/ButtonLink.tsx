import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * "action": the split "Book now" button (2026-10-18; "Start your training" until 2026-10-20): a filled bar
 * with the label, and the arrow in an inverse square at its right end.
 */
type Variant = "primary" | "secondary" | "text" | "action";
type Tone = "light" | "dark";

interface ButtonLinkProps {
  href: string;
  children: ReactNode;
  variant?: Variant;
  /** The surface the button sits on. */
  tone?: Tone;
  external?: boolean;
  className?: string;
  /** "action" only: extra classes for the arrow square (e.g. responsive tone overrides). */
  arrowClassName?: string;
}

const base =
  "group inline-flex items-center gap-3 whitespace-nowrap text-sm font-semibold uppercase tracking-[0.08em] transition-[color,background-color,border-color,text-decoration-color] duration-200";

// The focus ring takes the surface's text colour, not the button's, so it
// stays visible outside a filled button; it is not transitioned, so it shows
// at full contrast immediately. Filled buttons press down slightly.
const press = "active:translate-y-px";
const ring: Record<Tone, string> = {
  light: "focus-visible:outline-ink",
  dark: "focus-visible:outline-paper",
};

const styles: Record<Tone, Record<Variant, string>> = {
  light: {
    primary: `min-h-12 px-6 bg-ink text-paper hover:bg-ink-soft ${press}`,
    secondary: `min-h-12 px-6 border border-ink text-ink hover:bg-ink hover:text-paper ${press}`,
    text: "min-h-11 text-ink underline-offset-[6px] decoration-1 hover:underline",
    action: `min-h-14 bg-ink text-paper hover:bg-ink-soft ${press}`,
  },
  dark: {
    primary: `min-h-12 px-6 rounded-full bg-paper text-ink hover:bg-white ${press}`,
    secondary: `min-h-12 px-6 rounded-full border border-paper/40 text-paper hover:border-paper hover:bg-paper hover:text-ink ${press}`,
    text: "min-h-11 text-paper underline-offset-[6px] decoration-1 hover:underline",
    action: `min-h-14 rounded-full bg-paper text-ink hover:bg-white ${press}`,
  },
};

/** The arrow square of an "action" button: the inverse of its bar. */
const actionArrow: Record<Tone, string> = {
  light: "bg-paper text-ink",
  dark: "rounded-full bg-ink text-paper",
};

function Arrow() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className="size-4 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path d="M1 8h13M9 3l5 5-5 5" />
    </svg>
  );
}

export function ButtonLink({
  href,
  children,
  variant = "primary",
  tone = "light",
  external = false,
  className,
  arrowClassName,
}: ButtonLinkProps) {
  const action = variant === "action";
  const classes = cn(base, styles[tone][variant], ring[tone], action ? "justify-between gap-4 p-1" : "justify-center", className);
  const content = action ? (
    <>
      <span className="flex-1 pl-4 text-left sm:pl-5">{children}</span>
      <span
        aria-hidden="true"
        className={cn("flex w-12 shrink-0 items-center justify-center self-stretch", actionArrow[tone], arrowClassName)}
      >
        <Arrow />
      </span>
    </>
  ) : null;

  if (external) {
    return (
      <a href={href} className={classes} target="_blank" rel="noopener noreferrer">
        {action ? content : children}
        {action ? null : <Arrow />}
        <span className="sr-only">(opens in a new tab)</span>
      </a>
    );
  }

  return (
    <Link href={href} className={classes}>
      {action ? content : children}
      {action ? null : <Arrow />}
    </Link>
  );
}
