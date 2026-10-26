import { formatAddressLines, mapsUrl } from "@/content/site";
import { getPrimaryCtaFor } from "@/lib/booking";
import { Section, SectionHeading } from "@/components/ui/Section";
import { StartTraining } from "@/components/ui/StartTraining";
import { hero } from "@/content/home";

/**
 * Where to go, and the last Book now (mobile-first redesign, 2026-10-24):
 * the address, directions and one line on how booking works. The terms live
 * with the memberships.
 */
export function PracticalInfo() {
  const cta = getPrimaryCtaFor("group-class");
  return (
    <Section id="practical-info" labelledBy="practical-heading">
      <div className="lg:grid lg:grid-cols-12 lg:gap-x-14">
        <SectionHeading id="practical-heading" className="lg:col-span-5" title="Find us" />
        <div className="mt-6 grid grid-cols-1 gap-8 border-t border-ink pt-5 sm:grid-cols-2 lg:col-span-7 lg:mt-0 lg:gap-10">
          <div>
            <address className="not-italic leading-relaxed">
              {formatAddressLines().map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </address>
            <a
              href={mapsUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold underline underline-offset-4 hover:no-underline"
            >
              Get directions<span className="sr-only"> (opens in a new tab)</span>
            </a>
          </div>
          <div>
            <p>Pick a class and send your request. Alex confirms every place.</p>
            <StartTraining href={cta.href} label={cta.kind === "booking" ? hero.primaryLabel : cta.label} external={cta.external} className="mt-5 w-full sm:w-64" />
          </div>
        </div>
      </div>
    </Section>
  );
}
