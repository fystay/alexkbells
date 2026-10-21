import Image from "next/image";
import Link from "next/link";
import { site } from "@/content/site";
import { cn } from "@/lib/cn";

interface LogoProps {
  /** mark: the R monogram with the name beside it (header). lockup: the full supplied logo (footer). */
  variant?: "mark" | "lockup";
  /** Surface behind the logo: "dark" uses the cream artwork, "light" the black. */
  tone?: "dark" | "light";
  className?: string;
  priority?: boolean;
}

/**
 * The supplied artwork, in the version that suits the surface. The header
 * pairs the monogram with the name as live text so it stays sharp and
 * readable at small sizes; the footer shows the whole lockup.
 */
export function Logo({ variant = "mark", tone = "dark", className, priority = false }: LogoProps) {
  const art = tone === "dark" ? "cream" : "black";
  const muted = tone === "dark" ? "text-muted-inverse" : "text-muted";
  const { logo } = site;

  return (
    <Link
      href="/"
      className={cn("inline-flex min-h-11 items-center gap-3", className)}
      aria-label={`${site.name} ${site.descriptor}, home`}
    >
      {variant === "lockup" ? (
        <Image
          src={logo.lockup[art].src}
          alt=""
          width={logo.lockup[art].width}
          height={logo.lockup[art].height}
          sizes="224px"
          className="h-auto w-44 sm:w-52"
        />
      ) : (
        <>
          <Image
            src={logo.mark[art].src}
            alt=""
            width={logo.mark[art].width}
            height={logo.mark[art].height}
            priority={priority}
            sizes="64px"
            className="h-8 w-auto sm:h-9"
          />
          <span className="flex flex-col leading-none">
            <span className="text-lg font-extrabold uppercase tracking-[0.18em] [font-stretch:112%] sm:text-xl">{site.name}</span>
            <span className={cn("eyebrow mt-1 hidden text-[0.5625rem] tracking-[0.3em] 2xs:block", muted)}>{site.descriptor}</span>
          </span>
        </>
      )}
    </Link>
  );
}
