import { timetable } from "@/content/classes";
import { hero } from "@/content/home";
import { membershipPlans } from "@/content/memberships";
import { getService } from "@/content/services";
import { site } from "@/content/site";
import { getPrimaryCtaFor } from "@/lib/booking";
import { formatPenceShort, planFigures } from "@/lib/membership";
import { isPublishable, publishable } from "@/lib/publish";
import { groupedSessions } from "@/lib/schedule";
import { Section } from "@/components/ui/Section";
import { StartTraining } from "@/components/ui/StartTraining";

/**
 * Straight under the hero (option D, owner 2026-10-22): a short statement of
 * how often classes run, then When / Where / From and one Book now button.
 * Every figure comes from content (timetable, venue, membership prices).
 */
export function QuickFacts() {
  const book = getPrimaryCtaFor("group-class");
  const price = publishable(getService("group-classes").prices)[0];
  const open = isPublishable(timetable.status);
  const count = open ? timetable.sessions.length : 0;
  const times = open ? groupedSessions(timetable.sessions).map((t) => `${t.days} ${t.time}`) : [];
  const lowest = price ? Math.min(...membershipPlans.map((p) => planFigures(p, price.amountGbp).perClassPence)) : null;

  type Fact = { label: string; value: string | string[] };
  const facts = ([
    times.length ? { label: "When", value: times } : null,
    { label: "Where", value: `${site.location.venue}, ${site.location.town}` },
    lowest !== null ? { label: "From", value: `${formatPenceShort(lowest)} a class` } : null,
  ] as (Fact | null)[]).filter((f): f is Fact => f !== null);

  return (
    <Section tone="white" spacing="compact" labelledBy="quick-facts-heading">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[auto_1fr_auto] lg:items-end lg:gap-10">
        <div>
          <p className="eyebrow">Group kettlebell classes</p>
          <h2 id="quick-facts-heading" className="mt-3 font-display text-h1 leading-[0.95]">
            {count > 0 ? (
              <>
                <span className="block whitespace-nowrap">
                  {count} {count === 1 ? "class" : "classes"}
                </span>
                <span className="block">a week</span>
              </>
            ) : (
              "Kettlebell classes"
            )}
          </h2>
        </div>
        <dl className="grid grid-cols-[auto_1fr] gap-x-5 gap-y-2">
          {facts.map((f) => (
            <div key={f.label} className="contents">
              <dt className="eyebrow pt-1">{f.label}</dt>
              <dd className="font-semibold">
                {Array.isArray(f.value)
                  ? f.value.map((v) => (
                      <span key={v} className="block">
                        {v}
                      </span>
                    ))
                  : f.value}
              </dd>
            </div>
          ))}
        </dl>
        <StartTraining href={book.href} label={book.kind === "booking" ? hero.primaryLabel : book.label} external={book.external} className="w-full lg:w-56" />
      </div>
    </Section>
  );
}
