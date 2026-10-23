import Link from "next/link";
import { timetable } from "@/content/classes";
import { membershipPlans } from "@/content/memberships";
import { getService } from "@/content/services";
import { site } from "@/content/site";
import { getPrimaryCtaFor } from "@/lib/booking";
import { formatPenceShort, planFigures } from "@/lib/membership";
import { isPublishable, publishable } from "@/lib/publish";
import { formatTime, partOfDay, shortDay, sortSessions } from "@/lib/schedule";
import { Section } from "@/components/ui/Section";
import { cn } from "@/lib/cn";

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
 * One card per class (part of day, day, time, Book). The home page is the
 * reference (owner, 2026-10-23); /classes shows the same cards.
 */
export function ClassWeekCards({ className }: { className?: string }) {
  const book = getPrimaryCtaFor("group-class");
  const sessions = isPublishable(timetable.status) ? sortSessions(timetable.sessions) : [];
  if (sessions.length === 0) return null;
  return (
    <ul aria-label="Class times" className={cn("grid grid-cols-3 gap-2.5 sm:gap-4", className)}>
      {sessions.map((s) => (
        <li key={s.id} className="flex flex-col items-center rounded-lg border border-ink px-2 py-4 text-center">
          <p className="eyebrow">{partOfDay(s.start)}</p>
          <p className="mt-2 font-display text-[clamp(1.75rem,1rem+3vw,2.75rem)] leading-none">
            <abbr title={s.day} className="no-underline">
              {shortDay(s.day)}
            </abbr>
          </p>
          <p className="mt-2 font-semibold">{formatTime(s.start)}</p>
          <Link
            href={book.href}
            {...(book.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            className="mt-1 inline-flex min-h-11 items-center text-xs font-semibold tracking-[0.08em] uppercase underline underline-offset-[6px] hover:no-underline"
          >
            Book<span className="sr-only"> {s.day} {formatTime(s.start)}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
