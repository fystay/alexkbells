import { getPrimaryCta } from "@/lib/booking";
import { StartTraining } from "@/components/ui/StartTraining";
import { Logo } from "./Logo";
import { DesktopNav, MobileNav } from "./NavLinks";

export function SiteHeader() {
  const cta = getPrimaryCta();

  return (
    <header className="sticky top-0 z-40 border-b border-grey bg-paper text-ink">
      <div className="container-page relative flex h-16 items-center justify-between gap-8 sm:h-20">
        <Logo priority />
        <div className="flex items-center gap-5 xl:gap-6">
          <DesktopNav />
          <div className="hidden md:block">
            <StartTraining href={cta.href} label={cta.label} external={cta.external} variant="button" />
          </div>
          <MobileNav cta={cta} />
        </div>
      </div>
    </header>
  );
}
