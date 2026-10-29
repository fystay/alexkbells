import type { ReactNode } from "react";
import { onlineClassBooking, timetable } from "@/content/classes";
import { faq } from "@/content/faq";
import { firstClassSteps as lines } from "@/content/home";
import { getService } from "@/content/services";
import { mapsUrl, site } from "@/content/site";
import { membershipPlans } from "@/content/memberships";
import { getPrimaryCtaFor } from "@/lib/booking";
import { onlineJoinEnabled } from "@/lib/membership-checkout";
import { ClassStepsRail } from "./ClassStepsRail";
import { isPublishable, publishable } from "@/lib/publish";
import { formatTime, sortSessions } from "@/lib/schedule";

/** A line, shown only while the FAQ answer it restates is confirmed. */
function confirmed<T>(
  id: "beginners" | "first-session" | "bring",
  value: T,
): T | null {
  const item = faq.find((f) => f.id === id);
  return item && isPublishable(item.status) ? value : null;
}

// What to bring, in the order of firstClassSteps.bringItems.
const BRING_ICONS: ReactNode[] = [
  <path
    key="top"
    className="ln"
    pathLength={1}
    d="M12 4 L4 8 L6 15 L9 14 V30 H25 V14 L28 15 L30 8 L22 4 Q17 9 12 4 Z"
  />,
  <g key="bottle">
    <path
      className="ln"
      pathLength={1}
      d="M14 3 H20 V7 Q24 9 24 14 V30 H10 V14 Q10 9 14 7 Z"
    />
    <path className="ln ln-faint" pathLength={1} d="M10 18 H24" />
  </g>,
  <g key="towel">
    <path className="ln" pathLength={1} d="M6 8 H28 V26 H6 Z" />
    <path className="ln ln-faint" pathLength={1} d="M6 21 H28" />
  </g>,
  <path
    key="shoe"
    className="ln"
    pathLength={1}
    d="M5 22 Q5 14 12 14 L18 18 Q26 20 29 24 V27 H5 Z"
  />,
];

/**
 * How to join a class, in three steps on a rail you open one at a time
 * (owner's classes design 2026-10-28; interactive, option B, 2026-10-29): see
 * ClassStepsRail for steps 1 and 2 (pick a class; the price, how often you'll
 * train and what a membership saves). Step 3 (where, with directions; the first
 * session; what to bring as small line drawings) is rendered here. Every figure
 * comes from content, and each FAQ-based line shows only while its answer is
 * confirmed. Bank transfer and cash are not shown (owner, 2026-10-29).
 */
export function ClassSteps({ className }: { className?: string }) {
  const sessions = isPublishable(timetable.status)
    ? sortSessions(timetable.sessions)
    : [];
  const minutes = sessions[0]?.durationMinutes ?? null;
  const price = publishable(getService("group-classes").prices)[0];
  const online = onlineJoinEnabled();
  const scaled = confirmed("beginners", lines.scaled);
  const beginners = confirmed("beginners", lines.beginners);
  const firstSession = confirmed("first-session", lines.firstSession);
  const bring = confirmed("bring", lines.bringItems);
  const l = site.location;
  const cta = getPrimaryCtaFor("group-class");

  // Step 3 has nothing to choose, so it is rendered here and handed to the rail.
  const where = (
    <>
      <div className="flex items-start gap-3.5">
        <svg
          viewBox="0 0 26 34"
          aria-hidden="true"
          className="h-[2.125rem] w-[1.625rem] flex-none"
        >
          <path
            className="ln"
            pathLength={1}
            d="M13 32s11-11 11-19A11 11 0 0 0 2 13c0 8 11 19 11 19z"
          />
          <circle className="fill-ink" cx="13" cy="13" r="3.5" />
        </svg>
        <div>
          <address className="not-italic">
            <b>{l.venue}</b>
            <br />
            {l.street}
            <br />
            {l.town}, {l.city}, {l.postcode}
          </address>
          <a
            href={mapsUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center font-semibold underline underline-offset-4 hover:no-underline"
          >
            Directions
            <span className="sr-only"> to {l.venue} (opens in a new tab)</span>
          </a>
        </div>
      </div>
      {firstSession ? <p>{firstSession}</p> : null}
      {bring ? (
        <>
          <ul
            aria-label="What to bring"
            className="grid grid-cols-2 gap-x-2 gap-y-4 min-[381px]:grid-cols-4"
          >
            {bring.map((item, i) => (
              <li
                key={item}
                className="flex min-w-0 flex-col items-center gap-2 text-center text-[0.8125rem] leading-tight"
              >
                <svg
                  viewBox="0 0 34 34"
                  aria-hidden="true"
                  className="size-[2.125rem]"
                >
                  {BRING_ICONS[i]}
                </svg>
                {item}
              </li>
            ))}
          </ul>
          <p>{lines.provided}</p>
        </>
      ) : null}
    </>
  );

  return (
    <ClassStepsRail
      className={className}
      classes={sessions.map((s) => ({
        id: s.id,
        day: s.day,
        time: formatTime(s.start),
      }))}
      minutes={minutes}
      scaled={scaled}
      priceGbp={price ? price.amountGbp : null}
      plans={membershipPlans}
      book={{
        href: cta.href,
        label: cta.label,
        external: cta.external,
        onSite: cta.kind === "booking" && !cta.external,
      }}
      // Bank transfer and cash are not listed here (owner, 2026-10-29); online payment is, where it is on.
      payNote={online ? onlineClassBooking.payment : null}
      beginners={beginners}
      where={where}
    />
  );
}
