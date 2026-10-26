import { timetable } from "@/content/classes";
import { site } from "@/content/site";
import { getPrimaryCtaFor } from "@/lib/booking";
import { isPublishable } from "@/lib/publish";
import { groupedSessions } from "@/lib/schedule";
import { StartTraining } from "@/components/ui/StartTraining";
import { Section, type SectionTone } from "@/components/ui/Section";
import { hero } from "@/content/home";
import type { BookableService } from "@/lib/booking-options";

interface CtaBandProps {
  title?: string;
  body?: string;
  headingId?: string;
  /** Where Book now goes: the page's own service (default group class), or "any" for the /book chooser. */
  service?: BookableService | "any";
  tone?: SectionTone;
}

/**
 * Closing call to action: one line (the class times unless the page gives its
 * own), one booking button and Instagram as a quieter link. No arrow (owner rule). Nothing here books anything: the button opens
 * the booking request flow.
 */
export function CtaBand({ title = "Ready to get stronger?", body, headingId = "cta-heading", service = "group-class", tone = "white" }: CtaBandProps) {
  const { instagram } = site.social;
  const cta = getPrimaryCtaFor(service);
  const times = isPublishable(timetable.status) ? groupedSessions(timetable.sessions) : [];

  return (
    <Section tone={tone} labelledBy={headingId}>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-end lg:gap-16">
        <div data-reveal className="lg:col-span-7">
          <h2 id={headingId} className="font-display text-h1 text-balance">
            {title}
          </h2>
          <p className="mt-5 max-w-xl text-lede">
            {body ?? (times.length > 0 ? `Classes run ${times.map((t) => `${t.days} ${t.time}`).join(", ")}.` : "Book now to join a class.")}
          </p>
        </div>
        <div data-reveal className="lg:col-span-5">
          <StartTraining href={cta.href} label={cta.kind === "booking" ? hero.primaryLabel : cta.label} external={cta.external} className="w-full" />
          <a
            href={instagram.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group mt-4 inline-flex min-h-11 items-center gap-2 font-semibold"
          >
            <span className="underline underline-offset-4 group-hover:no-underline">Message on Instagram</span>
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        </div>
      </div>
    </Section>
  );
}
