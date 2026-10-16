import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "text";
type Tone = "light" | "dark";

interface ButtonLinkProps {
  href: string;
  children: ReactNode;
  variant?: Variant;
  /** The surface the button sits on. */
  tone?: Tone;
  external?: boolean;
  className?: string;
}

const base =
  "group inline-flex items-center justify-center gap-3 whitespace-nowrap text-sm font-semibold uppercase tracking-[0.08em] transition-[color,background-color,border-color,text-decoration-color] duration-200";

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
  },
  dark: {
    primary: `min-h-12 px-6 bg-paper text-ink hover:bg-white ${press}`,
    secondary: `min-h-12 px-6 border border-paper/70 text-paper hover:bg-paper hover:text-ink ${press}`,
    text: "min-h-11 text-paper underline-offset-[6px] decoration-1 hover:underline",
  },
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
}: ButtonLinkProps) {
  const classes = cn(base, styles[tone][variant], ring[tone], className);

  if (external) {
    return (
      <a href={href} className={classes} target="_blank" rel="noopener noreferrer">
        {children}
        <Arrow />
        <span className="sr-only">(opens in a new tab)</span>
      </a>
    );
  }

  return (
    <Link href={href} className={classes}>
      {children}
      <Arrow />
    </Link>
  );
}
