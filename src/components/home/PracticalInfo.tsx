import Link from "next/link";
import { formatAddressLines, mapsUrl } from "@/content/site";
import { getPrimaryCtaFor } from "@/lib/booking";
import { Section, SectionHeading } from "@/components/ui/Section";
import { StartTraining } from "@/components/ui/StartTraining";
import { hero } from "@/content/home";

/**
 * Where to go and how to book, with the one-line cancellation summary. The
 * class times are shown once, under the hero (QuickFacts), not repeated here.
 */
export function PracticalInfo() {
  const cta = getPrimaryCtaFor("group-class");
  return (
    <Section id="practical-info" labelledBy="practical-heading">
      <SectionHeading id="practical-heading" eyebrow="Practical information" title="Find us and book" />
      <div className="mt-8 grid grid-cols-1 gap-8 lg:mt-10 lg:grid-cols-12 lg:gap-10">
        <div className="lg:col-span-5">
          <h3 className="eyebrow mb-4">Where</h3>
          <address className="border-t border-grey pt-3 not-italic leading-relaxed">
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
        <div className="lg:col-span-7">
          <h3 className="eyebrow mb-4">Book</h3>
          <p className="border-t border-grey pt-3">Pick a class and send your request; it takes about a minute. Alex confirms each place. Cancel 24 hours or more before a class and your credit is returned.</p>
          <StartTraining href={cta.href} label={cta.kind === "booking" ? hero.primaryLabel : cta.label} external={cta.external} className="mt-5 w-full sm:w-64" />
          <p className="mt-4 text-sm">
            <Link href="/memberships#cancellation" className="font-semibold underline underline-offset-4 hover:no-underline">
              Read the cancellation policy
            </Link>
          </p>
        </div>
      </div>
    </Section>
  );
}
