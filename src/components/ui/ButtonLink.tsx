import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * primary: black. secondary: outlined. text: underlined link. action: the
 * solid "action" bar. No arrows anywhere on the site (owner, 2026-10-22).
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

export function ButtonLink({ href, children, variant = "primary", external = false, className }: ButtonLinkProps) {
  const classes = cn(base, styles[variant], "justify-center", className);
  if (external) {
    return (
      <a href={href} className={classes} target="_blank" rel="noopener noreferrer">
        {children}
        <span className="sr-only">(opens in a new tab)</span>
      </a>
    );
  }

  return (
    <Link href={href} className={classes}>
      {children}
    </Link>
  );
}
