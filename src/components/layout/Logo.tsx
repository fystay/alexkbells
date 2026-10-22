import Image from "next/image";
import Link from "next/link";
import { site } from "@/content/site";
import { cn } from "@/lib/cn";

interface LogoProps {
  /** header: the top of the supplied artwork (monogram, RAENG, Thai). lockup: the whole logo. */
  variant?: "header" | "lockup";
  className?: string;
  priority?: boolean;
}

/**
 * Always the supplied artwork (black on the cream page): never retyped, never
 * recoloured. The header uses its top three lines at a size where they stay
 * crisp; the footer shows the whole logo.
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
          src={logo.header.src}
          alt=""
          width={logo.header.width}
          height={logo.header.height}
          priority={priority}
          sizes="120px"
          className="h-11 w-auto max-w-none shrink-0 sm:h-14"
        />
      )}
    </Link>
  );
}
