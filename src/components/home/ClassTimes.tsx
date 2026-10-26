import { timetable } from "@/content/classes";
import { membershipPlans } from "@/content/memberships";
import { getService } from "@/content/services";
import { site } from "@/content/site";
import { hero } from "@/content/home";
import { getPrimaryCtaFor } from "@/lib/booking";
import { formatPenceShort, planFigures } from "@/lib/membership";
import { isPublishable, publishable } from "@/lib/publish";
import { formatTime, partOfDay, sortSessions } from "@/lib/schedule";
import { StartTraining } from "@/components/ui/StartTraining";

/**
 * The week's classes as a plain timetable (mobile-first redesign, 2026-10-24):
 * one row per class, read at a glance on a phone, then the facts and one
 * Book now. Choosing the date happens in the booking calendar, so the rows
 * aren't choices. Every figure comes from content. Home and /classes share it.
 */
export function ClassTimes({ className }: { className?: string }) {
  const cta = getPrimaryCtaFor("group-class");
  const sessions = isPublishable(timetable.status) ? sortSessions(timetable.sessions) : [];
  const price = publishable(getService("group-classes").prices)[0];
  const lowest = price ? Math.min(...membershipPlans.map((p) => planFigures(p, price.amountGbp).perClassPence)) : null;
  const minutes = sessions[0]?.durationMinutes;
  if (sessions.length === 0) return null;
  return (
    <div className={className}>
      <ul aria-label="Class times" className="border-t border-ink">
        {sessions.map((s) => (
          <li key={s.id} className="flex items-baseline justify-between gap-4 border-b border-grey py-4">
            <span className="font-display text-h3">{s.day}</span>
            <span className="text-right">
              <span className="font-semibold tabular-nums">{formatTime(s.start)}</span>
              <span className="ml-2 text-sm">{partOfDay(s.start)}</span>
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-5 text-sm">
        {/* "Suitable for all experience levels, with exercises scaled to your ability" (groupClass, Alex's listing). */}
        {[minutes ? `${minutes} minutes` : null, "All levels, scaled to you", `${site.location.venue}, ${site.location.town}`].filter(Boolean).join(" · ")}
      </p>
      {price ? (
        <p className="mt-1 text-sm">
          £{price.amountGbp} a class{lowest !== null ? `, or from ${formatPenceShort(lowest)} with a membership` : ""}.
        </p>
      ) : null}
      <StartTraining href={cta.href} label={cta.kind === "booking" ? hero.primaryLabel : cta.label} external={cta.external} className="mt-6 w-full sm:w-72" />
    </div>
  );
}
