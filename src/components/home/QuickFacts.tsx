import { timetable } from "@/content/classes";
import { membershipPlans } from "@/content/memberships";
import { getService } from "@/content/services";
import { site } from "@/content/site";
import { getPrimaryCtaFor } from "@/lib/booking";
import { formatPenceShort, planFigures } from "@/lib/membership";
import { isPublishable, publishable } from "@/lib/publish";
import { formatTime, partOfDay, shortDay, sortSessions } from "@/lib/schedule";
import { Section } from "@/components/ui/Section";
import { ChoiceCards } from "@/components/ui/ChoiceCards";
import { ChoiceMark, choiceCard } from "@/components/ui/choice";
import { cn } from "@/lib/cn";
import { revealDelay } from "@/lib/reveal";

/**
 * The class week (option E, owner 2026-10-23): a statement of how often
 * classes run, one card per class (part of day, day, time, Book), then venue
 * and from-price. Every figure comes from content.
 */
export function QuickFacts() {
  const price = publishable(getService("group-classes").prices)[0];
  const sessions = isPublishable(timetable.status) ? sortSessions(timetable.sessions) : [];
  const lowest = price ? Math.min(...membershipPlans.map((p) => planFigures(p, price.amountGbp).perClassPence)) : null;

  return (
    <Section tone="white" spacing="compact" labelledBy="quick-facts-heading">
      <p className="eyebrow">Group kettlebell classes</p>
      <h2 id="quick-facts-heading" className="mt-3 font-display text-h1 leading-[0.95]">
        {sessions.length > 0 ? (
          <>
            <span className="block whitespace-nowrap">
              {sessions.length} {sessions.length === 1 ? "class" : "classes"}
            </span>
            <span className="block">a week</span>
          </>
        ) : (
          "Kettlebell classes"
        )}
      </h2>
      <ClassWeekCards className="mt-6" />
      <p className="mt-4">
        <span className="font-semibold">
          {site.location.venue}, {site.location.town}
        </span>
        {lowest !== null ? (
          <>
            {" "}
            · From <span className="font-semibold">{formatPenceShort(lowest)} a class</span> with a membership
          </>
        ) : null}
      </p>
    </Section>
  );
}

/**
 * One card per class (part of day, day, time): choose one, then Book now,
 * which opens the calendar on that class's next date (`?class=`). The home
 * page is the reference (owner, 2026-10-23); /classes shows the same cards.
 */
export function ClassWeekCards({ className }: { className?: string }) {
  const book = getPrimaryCtaFor("group-class");
  const sessions = isPublishable(timetable.status) ? sortSessions(timetable.sessions) : [];
  if (sessions.length === 0) return null;
  const href = (id: string) => (book.kind === "booking" && !book.external ? `${book.href}?class=${id}` : book.href);
  const choices = sessions.map((s) => ({ value: s.id, label: `${s.day} ${formatTime(s.start)}`, href: href(s.id), action: "Book now", external: book.external }));
  return (
    <ChoiceCards name="class" legend="Choose a class" choices={choices} idle="Book now" prompt="Choose a class to continue." className={className}>
      <ul aria-label="Class times" className="grid grid-cols-3 gap-2.5 sm:gap-4">
        {sessions.map((s, i) => (
          <li key={s.id} data-reveal style={revealDelay(i)} className={cn("flex flex-col items-center rounded-lg border border-ink bg-white px-2 pt-4 pb-1 text-center", choiceCard)}>
            <p className="eyebrow">{partOfDay(s.start)}</p>
            <p className="mt-2 font-display text-[clamp(1.75rem,1rem+3vw,2.75rem)] leading-none">
              <abbr title={s.day} className="no-underline">
                {shortDay(s.day)}
              </abbr>
            </p>
            <p className="mt-2 font-semibold">{formatTime(s.start)}</p>
            <ChoiceMark name="class" value={s.id} label={`${s.day} ${formatTime(s.start)}`} compact className="mt-3 w-full justify-center gap-2 pt-0" />
          </li>
        ))}
      </ul>
    </ChoiceCards>
  );
}
