import Image from "next/image";
import Link from "next/link";
import { site } from "@/content/site";
import { cn } from "@/lib/cn";

interface LogoProps {
  /** header: the whole logo, sized for the header. lockup: the whole logo, larger (footer). */
  variant?: "header" | "lockup";
  className?: string;
  priority?: boolean;
}

/**
 * Always the supplied artwork (black on the cream page): never retyped, never
 * recoloured. Header and footer both show the whole logo, tagline included.
 */
export function Logo({ variant = "header", className, priority = false }: LogoProps) {
  const { logo } = site;
  return (
    <Link
      href="/"
      className={cn("inline-flex min-h-11 shrink-0 items-center", className)}
      aria-label={`${site.name} ${site.descriptor}, home`}
    >
      {variant === "lockup" ? (
        <Image src={logo.lockup.src} alt="" width={logo.lockup.width} height={logo.lockup.height} sizes="240px" className="h-auto w-48 sm:w-56" />
      ) : (
        <Image
          src={logo.lockup.src}
          alt=""
          width={logo.lockup.width}
          height={logo.lockup.height}
          priority={priority}
          sizes="160px"
          // The whole artwork, so STRENGTH • COMMUNITY • DISCIPLINE keeps its proportions under
          // RAENG (owner, 2026-10-26). Heights keep the mark the size it was (68 / 92 px for the top part).
          className="h-[74px] w-auto max-w-none shrink-0 sm:h-[101px]"
        />
      )}
    </Link>
  );
}
