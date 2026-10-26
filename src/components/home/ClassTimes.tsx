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

/**
 * The week's classes (warm tech, owner's pick C, 2026-10-26): one white
 * rounded card per class, day left and time right, then the price in one
 * line. Choosing the date happens in the booking calendar, so the cards
 * aren't choices; the header's Book now is always on screen. Every figure
 * comes from content. Home and /classes share it.
 */
export function ClassTimes({ className }: { className?: string }) {
  const sessions = isPublishable(timetable.status) ? sortSessions(timetable.sessions) : [];
  const price = publishable(getService("group-classes").prices)[0];
  const lowest = price ? Math.min(...membershipPlans.map((p) => planFigures(p, price.amountGbp).perClassPence)) : null;
  if (sessions.length === 0) return null;
  return (
    <div className={className}>
      <ul aria-label="Class times" className="grid grid-cols-1 gap-3">
        {sessions.map((s) => (
          <li key={s.id} className="card flex min-h-16 items-center justify-between gap-4 px-5 py-4 text-lg">
            <span className="font-semibold">{s.day}</span>
            <span className="tabular-nums">{formatTime(s.start)}</span>
          </li>
        ))}
      </ul>
      {price ? (
        <p className="mt-6">
          £{price.amountGbp} a class{lowest !== null ? `, or from ${formatPenceShort(lowest)} with a membership` : ""}.
        </p>
      ) : null}
    </div>
  );
}
