import { Logo } from "./Logo";
import { MobileNav } from "./NavLinks";

/**
 * The Menu dropdown at the left and the whole logo centred (tagline included,
 * in the artwork's own proportions: owner, 2026-10-26), the same at every
 * width. No Book now at the right: Alex asked for it to go (via the owner,
 * 2026-10-29); booking is on the hero, the classes and the closing band.
 */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 bg-paper text-ink">
      <div className="container-page grid h-[84px] grid-cols-[1fr_auto_1fr] items-center gap-2 sm:h-28 sm:gap-6">
        <div className="justify-self-start">
          <MobileNav />
        </div>
        <Logo priority />
        <div aria-hidden="true" />
      </div>
    </header>
  );
}
