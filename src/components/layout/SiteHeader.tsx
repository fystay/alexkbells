import { PRIMARY_CTA } from "@/lib/booking";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Logo } from "./Logo";
import { DesktopNav, MobileNav } from "./NavLinks";

export function SiteHeader() {
  const cta = PRIMARY_CTA;

  return (
    <header className="sticky top-0 z-40 bg-ink text-paper">
      <div className="container-page relative flex h-16 items-center justify-between gap-6 sm:h-20">
        <Logo tone="dark" priority />
        <div className="flex items-center gap-6 lg:gap-8">
          <DesktopNav />
          <div className="hidden md:block">
            <ButtonLink href={cta.href} external={cta.external} tone="dark" className="min-h-11 px-5">
              {cta.label}
            </ButtonLink>
          </div>
          <MobileNav cta={cta} />
        </div>
      </div>
    </header>
  );
}
