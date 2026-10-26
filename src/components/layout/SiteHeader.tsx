import { getPrimaryCtaFor } from "@/lib/booking";
import { HeaderBook } from "./HeaderBook";
import { Logo } from "./Logo";
import { MobileNav } from "./NavLinks";

/**
 * Three parts, the same at every width: the Menu dropdown at the left, the
 * whole logo centred (tagline included, in the artwork's own proportions:
 * owner, 2026-10-26), the booking button at the right.
 */
export function SiteHeader() {
  const cta = getPrimaryCtaFor("group-class");

  return (
    <header className="sticky top-0 z-40 bg-paper text-ink">
      <div className="container-page grid h-[84px] grid-cols-[1fr_auto_1fr] items-center gap-2 sm:h-28 sm:gap-6">
        <div className="justify-self-start">
          <MobileNav cta={cta} />
        </div>
        <Logo priority />
        <div className="justify-self-end">
          <HeaderBook cta={cta} />
        </div>
      </div>
    </header>
  );
}
