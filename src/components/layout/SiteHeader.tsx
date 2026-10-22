import { getPrimaryCtaFor } from "@/lib/booking";
import { StartTraining } from "@/components/ui/StartTraining";
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
      <div className="container-page relative grid h-16 grid-cols-[1fr_auto_1fr] items-center gap-2 sm:h-20 sm:gap-6">
        <div className="justify-self-start">
          <MobileNav cta={cta} />
        </div>
        <Logo priority />
        <div className="justify-self-end">
          <StartTraining href={cta.href} label={cta.label} external={cta.external} variant="button" />
        </div>
      </div>
    </header>
  );
}
