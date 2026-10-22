import { timetable } from "@/content/classes";
import { site } from "@/content/site";
import { getPrimaryCtaFor } from "@/lib/booking";
import { isPublishable } from "@/lib/publish";
import { groupedSessions } from "@/lib/schedule";
import { StartTraining } from "@/components/ui/StartTraining";
import { Section } from "@/components/ui/Section";
import { hero } from "@/content/home";

interface CtaBandProps {
  title?: string;
  body?: string;
  headingId?: string;
}

/**
 * Closing call to action: one line, the class times, one booking button and
 * Instagram as a quieter link. Nothing here books anything: the button opens
 * the booking request flow.
 */
export function CtaBand({ title = "Ready to get stronger?", body, headingId = "cta-heading" }: CtaBandProps) {
  const { instagram } = site.social;
  const cta = getPrimaryCtaFor("group-class");
  const times = isPublishable(timetable.status) ? groupedSessions(timetable.sessions) : [];

  return (
    <Section tone="white" labelledBy={headingId}>
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
            className="group mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-semibold uppercase tracking-[0.08em]"
          >
            <span className="underline underline-offset-[6px] group-hover:no-underline">Message on Instagram</span>
            <span aria-hidden="true">↗</span>
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        </div>
      </div>
    </Section>
  );
}
