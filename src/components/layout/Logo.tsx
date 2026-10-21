import Link from "next/link";
import { site } from "@/content/site";
import { cn } from "@/lib/cn";

interface LogoProps {
  /** mark: the wordmark alone (header). lockup: wordmark with the three themes beneath (footer). */
  variant?: "mark" | "lockup";
  /** Surface behind the logo. */
  tone?: "dark" | "light";
  className?: string;
}

/**
 * RAENG is set as type, not drawn: heavy, wide capitals in the site's own
 * typeface, tracked out. There is no logo artwork to keep in sync; if one is
 * supplied later, replace the contents of this component.
 */
export function Wordmark({ className }: { className?: string }) {
  return (
    // Negative right margin cancels the trailing letter-spacing so the word centres.
    <span className={cn("mr-[-0.2em] whitespace-nowrap font-extrabold uppercase tracking-[0.2em] [font-stretch:112%]", className)}>
      {site.name}
    </span>
  );
}

export function Logo({ variant = "mark", tone = "dark", className }: LogoProps) {
  const muted = tone === "dark" ? "text-muted-inverse" : "text-muted";
  return (
    <Link
      href="/"
      className={cn("inline-flex min-h-11 flex-col justify-center leading-none", className)}
      aria-label={`${site.name}, home`}
    >
      <Wordmark className={variant === "lockup" ? "text-3xl sm:text-4xl" : "text-xl sm:text-2xl"} />
      {variant === "lockup" ? (
        <span className={cn("eyebrow mt-3 text-[0.6875rem]", muted)}>{site.themes.join(" · ")}</span>
      ) : null}
    </Link>
  );
}
