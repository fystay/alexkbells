import { timetable } from "@/content/classes";
import { hero } from "@/content/home";
import { membershipPlans } from "@/content/memberships";
import { getService } from "@/content/services";
import { site } from "@/content/site";
import { getPrimaryCtaFor } from "@/lib/booking";
import { formatPenceShort, planFigures } from "@/lib/membership";
import { isPublishable, publishable } from "@/lib/publish";
import { groupedSessions, shortDay, sortSessions } from "@/lib/schedule";
import { Section } from "@/components/ui/Section";
import { StartTraining } from "@/components/ui/StartTraining";

/**
 * Three short facts and the class times, straight under the hero, so the
 * first thing after the film is what, where and how much, with one button.
 */
export function QuickFacts() {
  const book = getPrimaryCtaFor("group-class");
  const price = publishable(getService("group-classes").prices)[0];
  const open = isPublishable(timetable.status);
  const sessions = open ? sortSessions(timetable.sessions) : [];
  const days = [...new Set(sessions.map((s) => shortDay(s.day)))].join(" · ");
  const times = open ? groupedSessions(timetable.sessions).map((t) => `${t.days} ${t.time}`).join(" · ") : "";
  const lowest = price ? Math.min(...membershipPlans.map((p) => planFigures(p, price.amountGbp).perClassPence)) : null;

  const facts = [
    days ? { label: "Classes", value: days } : null,
    { label: "Where", value: `${site.location.venue}, ${site.location.town}` },
    lowest !== null ? { label: "From", value: `${formatPenceShort(lowest)} a class` } : null,
  ].filter((f): f is { label: string; value: string } => f !== null);

  return (
    <Section tone="white" spacing="compact" labelledBy="quick-facts-heading" className="border-y border-grey">
      <h2 id="quick-facts-heading" className="sr-only">
        At a glance
      </h2>
      <dl className="grid grid-cols-3 gap-2 sm:gap-4">
        {facts.map((f) => (
          <div key={f.label} className="rounded-lg border border-grey p-3 sm:p-4">
            <dt className="eyebrow">{f.label}</dt>
            <dd className="mt-1 text-sm font-semibold sm:text-base">{f.value}</dd>
          </div>
        ))}
      </dl>
      {times ? (
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-semibold">
            <span className="eyebrow mr-3">Class times</span>
            {times}
          </p>
          <StartTraining href={book.href} label={book.kind === "booking" ? hero.primaryLabel : book.label} external={book.external} className="w-full sm:w-64" />
        </div>
      ) : null}
    </Section>
  );
}
