import { timetable } from "@/content/classes";
import { getService } from "@/content/services";
import { site } from "@/content/site";
import { getPrimaryCta } from "@/lib/booking";
import { isPublishable, publishable } from "@/lib/publish";
import { formatGbp, groupedSessions } from "@/lib/schedule";
import { StartTraining } from "@/components/ui/StartTraining";
import { Section } from "@/components/ui/Section";
import { KeepHyphens } from "@/components/ui/KeepHyphens";
import { cn } from "@/lib/cn";

const COLS: Record<number, string> = { 1: "grid-cols-1", 2: "grid-cols-2", 3: "grid-cols-3", 4: "grid-cols-4" };

interface CtaBandProps {
  title?: string;
  body?: string;
  headingId?: string;
}

/**
 * Closing call to action (option A, 2026-10-18): the headline, the facts
 * people want right before they decide (class times and the class price,
 * from the confirmed timetable and prices), one split "Book now"
 * button, and Instagram as a quieter text link.
 */
export function CtaBand({ title = "Pick up a bell.", body, headingId = "cta-heading" }: CtaBandProps) {
  const { instagram } = site.social;
  const cta = getPrimaryCta();
  const times = isPublishable(timetable.status) ? groupedSessions(timetable.sessions) : [];
  const price = publishable(getService("group-classes").prices)[0];
  const facts = [
    ...times.map((t) => ({ label: t.days, value: t.time })),
    ...(price ? [{ label: "Class", value: formatGbp(price.amountGbp) }] : []),
  ];

  return (
    <Section tone="ink" labelledBy={headingId}>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-end lg:gap-16">
        <div data-reveal className="lg:col-span-6">
          <h2 id={headingId} className="font-display text-display text-balance">
            <KeepHyphens>{title}</KeepHyphens>
          </h2>
          {body ? <p className="mt-6 max-w-xl text-lede text-muted-inverse">{body}</p> : null}
        </div>
        <div data-reveal className="lg:col-span-6">
          {facts.length > 0 ? (
            <dl aria-label="Group classes" className={cn("grid border-y border-line-inverse", COLS[facts.length] ?? "grid-cols-2")}>
              {facts.map((f, i) => (
                <div key={f.label} className={i > 0 ? "border-l border-line-inverse py-4 pl-3 sm:pl-5" : "py-4 pr-3"}>
                  <dt className="eyebrow text-muted-inverse">{f.label}</dt>
                  <dd className="mt-1 font-display text-lg whitespace-nowrap sm:text-xl">{f.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
          <StartTraining href={cta.href} label={cta.label} external={cta.external} tone="dark" className="mt-7 w-full" />
          <a
            href={instagram.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-semibold uppercase tracking-[0.08em] focus-visible:outline-paper"
          >
            <span className="underline decoration-muted-inverse underline-offset-[6px] group-hover:decoration-paper">Message on Instagram</span>
            <span aria-hidden="true">↗</span>
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        </div>
      </div>
    </Section>
  );
}
