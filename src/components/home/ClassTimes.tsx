import { timetable } from "@/content/classes";
import { membershipPlans } from "@/content/memberships";
import { getService } from "@/content/services";
import { formatPenceShort, planFigures } from "@/lib/membership";
import { isPublishable, publishable } from "@/lib/publish";
import { formatTime, sortSessions } from "@/lib/schedule";

/**
 * "60 minutes. All levels, scaled to you." The line under the timetable's
 * heading. "Suitable for all experience levels, with exercises scaled to your
 * ability" is from Alex's class listing (content/classes.ts).
 */
export function classFacts(): string {
  const minutes = isPublishable(timetable.status) ? timetable.sessions[0]?.durationMinutes : undefined;
  return [minutes ? `${minutes} minutes.` : null, "All levels, scaled to you."].filter(Boolean).join(" ");
}

/** "£12 a class, or from £7.08 with a membership." From content; null if the price isn't confirmed. */
export function classPriceLine(): string | null {
  const price = publishable(getService("group-classes").prices)[0];
  if (!price) return null;
  const lowest = Math.min(...membershipPlans.map((p) => planFigures(p, price.amountGbp).perClassPence));
  return `£${price.amountGbp} a class, or from ${formatPenceShort(lowest)} with a membership.`;
}

/**
 * The week's classes (option 1 of the card overhaul, owner 2026-10-26): one
 * row per class, day left and time right, no rules between them, no cards.
 * Choosing the date happens in the booking calendar, so the rows aren't
 * choices. Every figure comes from content. Home and /classes share it.
 */
export function ClassTimes({ className, showPrice = true }: { className?: string; showPrice?: boolean }) {
  const sessions = isPublishable(timetable.status) ? sortSessions(timetable.sessions) : [];
  const price = showPrice ? classPriceLine() : null;
  if (sessions.length === 0) return null;
  return (
    <div className={className}>
      <ul aria-label="Class times">
        {sessions.map((s) => (
          <li key={s.id} className="flex min-h-11 items-center justify-between gap-4 py-1.5">
            <span className="font-semibold">{s.day}</span>
            <span className="tabular-nums">{formatTime(s.start)}</span>
          </li>
        ))}
      </ul>
      {price ? <p className="mt-4">{price}</p> : null}
    </div>
  );
}
