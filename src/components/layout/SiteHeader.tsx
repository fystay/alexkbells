import { site } from "@/content/site";
import { getPrimaryCtaFor } from "@/lib/booking";
import { HeaderBook } from "./HeaderBook";
import { Logo } from "./Logo";
import { MobileNav } from "./NavLinks";

/**
 * Three parts, the same at every width: the Menu dropdown at the left, the
 * logo centred, the booking button at the right.
 */
export function SiteHeader() {
  const cta = getPrimaryCtaFor("group-class");

  return (
    <header className="sticky top-0 z-40 border-b border-grey bg-paper text-ink">
      <div className="container-page grid h-[84px] grid-cols-[1fr_auto_1fr] items-center gap-2 sm:h-28 sm:gap-6">
        <div className="justify-self-start">
          <MobileNav cta={cta} />
        </div>
        <Logo priority />
        <div className="justify-self-end">
          <HeaderBook cta={cta} />
        </div>
      </div>
      {/* The logo's tagline, as in the artwork: the line above is part of the logo image.
          From tablet up only: on phones the header stays one slim row (mobile-first redesign, 2026-10-24). */}
      <p className="-mt-1 hidden pb-2 text-center sm:block text-[0.625rem] font-medium uppercase tracking-[0.3em] sm:pb-3 sm:text-xs">
        {site.themes.join(" · ")}
      </p>
    </header>
  );
}
