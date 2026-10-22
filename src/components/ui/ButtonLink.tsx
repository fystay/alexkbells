import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * primary: black. secondary: outlined. text: underlined link. action: the
 * split "Book" bar (label left, arrow in a white square at the right).
 * Hover inverts black and white (a fourth colour would be needed for anything
 * else, and white on the grey fails contrast).
 */
type Variant = "primary" | "secondary" | "text" | "action";

interface ButtonLinkProps {
  href: string;
  children: ReactNode;
  variant?: Variant;
  external?: boolean;
  className?: string;
}

const base =
  "group inline-flex items-center gap-3 whitespace-nowrap text-sm font-semibold uppercase tracking-[0.08em] transition-colors duration-200";
const press = "active:translate-y-px";

const styles: Record<Variant, string> = {
  primary: `min-h-12 rounded-md border border-ink bg-ink px-6 text-white hover:bg-white hover:text-ink ${press}`,
  secondary: `min-h-12 rounded-md border border-ink px-6 text-ink hover:bg-ink hover:text-white ${press}`,
  text: "min-h-11 text-ink underline-offset-[6px] decoration-1 hover:underline",
  action: `min-h-14 rounded-md border border-ink bg-ink text-white hover:bg-white hover:text-ink ${press}`,
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

export function ButtonLink({ href, children, variant = "primary", external = false, className }: ButtonLinkProps) {
  const action = variant === "action";
  const classes = cn(base, styles[variant], action ? "justify-between gap-4 p-1" : "justify-center", className);
  const content = action ? (
    <>
      <span className="flex-1 pl-4 text-left sm:pl-5">{children}</span>
      <span
        aria-hidden="true"
        className="flex w-12 shrink-0 items-center justify-center self-stretch rounded bg-white text-ink group-hover:bg-ink group-hover:text-white"
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
