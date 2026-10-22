import Link from "next/link";
import { bookingSteps } from "@/content/home";
import { formatAddressLines, mapsUrl } from "@/content/site";
import { getPrimaryCtaFor } from "@/lib/booking";
import { Section, SectionHeading } from "@/components/ui/Section";
import { StartTraining } from "@/components/ui/StartTraining";
import { Timetable } from "@/components/sections/Timetable";
import { hero } from "@/content/home";

/**
 * Everything someone needs to turn up: when, where, how to book and the
 * one-line cancellation summary. The full policy is one link away.
 */
export function PracticalInfo() {
  const cta = getPrimaryCtaFor("group-class");
  return (
    <Section id="practical-info" labelledBy="practical-heading">
      <SectionHeading id="practical-heading" eyebrow="Practical information" title="Class times and booking" />
      <div className="mt-10 grid grid-cols-1 gap-10 lg:mt-14 lg:grid-cols-12 lg:gap-12">
        <div className="lg:col-span-4">
          <h3 className="eyebrow mb-4">When</h3>
          <Timetable layout="compact" />
        </div>
        <div className="lg:col-span-3">
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
        <div className="lg:col-span-5">
          <h3 className="eyebrow mb-4">How to book</h3>
          <ol className="border-t border-grey">
            {bookingSteps.map((s, i) => (
              <li key={s.title} className="grid grid-cols-[2rem_1fr] gap-x-3 border-b border-grey py-3">
                <span className="eyebrow pt-1" aria-hidden="true">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <p>
                  <span className="font-semibold">{s.title}.</span> {s.body}
                </p>
              </li>
            ))}
          </ol>
          <StartTraining href={cta.href} label={cta.kind === "booking" ? hero.primaryLabel : cta.label} external={cta.external} className="mt-6 w-full sm:w-64" />
        </div>
      </div>
      <p className="mt-10 max-w-3xl border-t border-grey pt-5 text-sm">
        Cancel 24 hours or more before a class and your credit is returned. Later cancellations and no-shows forfeit it.{" "}
        <Link href="/memberships#cancellation" className="font-semibold underline underline-offset-4 hover:no-underline">
          Read the full cancellation policy
        </Link>
        .
      </p>
    </Section>
  );
}
