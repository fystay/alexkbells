import Image from "next/image";
import Link from "next/link";
import { site } from "@/content/site";
import { cn } from "@/lib/cn";

interface LogoProps {
  /** Surface behind the logo. */
  tone?: "dark" | "light";
  className?: string;
  priority?: boolean;
}

/**
 * Uses the supplied logo artwork when configured in site.ts.
 * Fallback is the plain brand name in the body typeface — deliberately not
 * an imitation of the monogram or wordmark.
 */
export function Logo({ tone = "dark", className, priority = false }: LogoProps) {
  const logo = site.logo;

  return (
    <Link
      href="/"
      className={cn("inline-flex min-h-11 items-center", className)}
      aria-label={`${site.name}, home`}
    >
      {logo ? (
        <Image
          src={logo.src}
          alt=""
          width={logo.width}
          height={logo.height}
          priority={priority}
          className={cn(
            "h-10 w-auto sm:h-12",
            // Black-background artwork sits on ink; on light surfaces it is
            // framed as a deliberate black tile rather than a stray box.
            logo.onDark && tone === "light" && "bg-ink p-1.5",
          )}
        />
      ) : (
        <span className="flex flex-col leading-none">
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
      )}
    </Link>
  );
}
