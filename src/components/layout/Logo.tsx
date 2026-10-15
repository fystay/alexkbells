import Image from "next/image";
import Link from "next/link";
import { site } from "@/content/site";
import { cn } from "@/lib/cn";

interface LogoProps {
  /**
   * mark: AR monogram + brand name text (header).
   * lockup: the full supplied logo (footer).
   */
  variant?: "mark" | "lockup";
  /** Surface behind the logo. The artwork is white, so light surfaces get an ink tile. */
  tone?: "dark" | "light";
  className?: string;
  priority?: boolean;
}

function BrandText({ tone, className }: { tone: "dark" | "light"; className?: string }) {
  return (
    <span className={cn("flex-col leading-none", className)}>
      <span className="whitespace-nowrap text-base font-extrabold uppercase tracking-[0.06em] [font-stretch:112%] sm:text-lg">
        {site.name}
      </span>
      <span
        className={cn(
          "mt-1 text-[0.625rem] font-medium uppercase tracking-[0.24em]",
          tone === "dark" ? "text-muted-inverse" : "text-muted",
        )}
      >
        {site.descriptor}
      </span>
    </span>
  );
}

/**
 * Uses the supplied logo artwork from site.ts. Without it, falls back to the
 * plain brand name in the body typeface — never an imitation of the monogram.
 */
export function Logo({ variant = "mark", tone = "dark", className, priority = false }: LogoProps) {
  const logo = site.logo;
  const tile = tone === "light" && "bg-ink p-2";

  return (
    <Link
      href="/"
      className={cn("inline-flex min-h-11 items-center gap-3", className)}
      aria-label={`${site.name}, home`}
    >
      {!logo ? (
        <BrandText tone={tone} className="flex" />
      ) : variant === "lockup" ? (
        <Image
          src={logo.lockup.src}
          alt=""
          width={logo.lockup.width}
          height={logo.lockup.height}
          sizes="240px"
          className={cn("h-auto w-48 sm:w-56", tile)}
        />
      ) : (
        <>
          <Image
            src={logo.mark.src}
            alt=""
            width={logo.mark.width}
            height={logo.mark.height}
            priority={priority}
            sizes="96px"
            className={cn("h-9 w-auto sm:h-10", tile)}
          />
          {/* Name alongside the mark from 360px up; the narrowest phones show the mark alone. */}
          <BrandText tone={tone} className="hidden 2xs:flex" />
        </>
      )}
    </Link>
  );
}
