import type { ReactNode } from "react";
import Link from "next/link";
import { groupClass, onlineClassBooking, timetable } from "@/content/classes";
import { faq } from "@/content/faq";
import { firstClassSteps as lines } from "@/content/home";
import { getService } from "@/content/services";
import { mapsUrl, site } from "@/content/site";
import { onlineJoinEnabled } from "@/lib/membership-checkout";
import { isPublishable, publishable } from "@/lib/publish";
import { formatTime, sortSessions } from "@/lib/schedule";
import { revealDelay } from "@/lib/reveal";

const WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/** A line, shown only while the FAQ answer it restates is confirmed. */
function confirmed<T>(id: "beginners" | "first-session" | "bring", value: T): T | null {
  const item = faq.find((f) => f.id === id);
  return item && isPublishable(item.status) ? value : null;
}

// What to bring, in the order of firstClassSteps.bringItems.
const BRING_ICONS: ReactNode[] = [
  <path key="top" className="ln" pathLength={1} d="M12 4 L4 8 L6 15 L9 14 V30 H25 V14 L28 15 L30 8 L22 4 Q17 9 12 4 Z" />,
  <g key="bottle">
    <path className="ln" pathLength={1} d="M14 3 H20 V7 Q24 9 24 14 V30 H10 V14 Q10 9 14 7 Z" />
    <path className="ln ln-faint" pathLength={1} d="M10 18 H24" />
  </g>,
  <g key="towel">
    <path className="ln" pathLength={1} d="M6 8 H28 V26 H6 Z" />
    <path className="ln ln-faint" pathLength={1} d="M6 21 H28" />
  </g>,
  <path key="shoe" className="ln" pathLength={1} d="M5 22 Q5 14 12 14 L18 18 Q26 20 29 24 V27 H5 Z" />,
];

function Step({ n, title, children, last = false }: { n: number; title: string; children: ReactNode; last?: boolean }) {
  return (
    <li data-reveal style={revealDelay(n - 1)} className={`relative grid grid-cols-[2.25rem_1fr] gap-x-4 sm:gap-x-5 ${last ? "" : "pb-10"}`}>
      {/* The rail joining the steps. */}
      {last ? null : <span aria-hidden="true" className="absolute top-[2.375rem] bottom-0.5 left-[1.0625rem] w-px bg-line" />}
      <span aria-hidden="true" className="relative grid size-9 place-items-center rounded-full border-[1.5px] border-ink bg-paper text-sm font-bold tabular-nums">
        {n}
      </span>
      <div className="flex min-w-0 flex-col gap-3.5 pt-1">
        <h3 className="font-display text-xl font-bold">{title}</h3>
        {children}
      </div>
    </li>
  );
}

/**
 * How to join a class, in three steps on a rail (owner's classes design,
 * 2026-10-28): pick a class (length, level and the week with the class days
 * and times), book your place (the price, how to pay, the note for
 * beginners), turn up and train (where, with directions; the first session;
 * what to bring as small line drawings). Every figure comes from content, and
 * each FAQ-based line shows only while its answer is confirmed.
 */
export function ClassSteps({ className }: { className?: string }) {
  const sessions = isPublishable(timetable.status) ? sortSessions(timetable.sessions) : [];
  const minutes = sessions[0]?.durationMinutes;
  const price = publishable(getService("group-classes").prices)[0];
  const payBy = onlineJoinEnabled() ? onlineClassBooking.paymentMethods : groupClass.paymentMethods;
  const scaled = confirmed("beginners", lines.scaled);
  const beginners = confirmed("beginners", lines.beginners);
  const firstSession = confirmed("first-session", lines.firstSession);
  const bring = confirmed("bring", lines.bringItems);
  const l = site.location;

  return (
    <ol className={className}>
      <Step n={1} title="Pick a class">
        <p>{[minutes ? `${minutes} minutes, all levels.` : "All levels.", scaled].filter(Boolean).join(" ")}</p>
        {sessions.length > 0 ? (
          <ul aria-label="Class days and times" className="mt-1 grid grid-cols-7 gap-0.5">
            {WEEK.map((day) => {
              const s = sessions.find((x) => x.day === day);
              return (
                <li key={day} aria-hidden={s ? undefined : true} className="flex flex-col items-center gap-1.5 text-xs font-semibold tracking-[0.1em]">
                  <span className={s ? "" : "font-normal"} aria-hidden="true">
                    {day[0]}
                  </span>
                  <i aria-hidden="true" className={s ? "size-3 rounded-full bg-ink" : "size-2 rounded-full border-[1.5px] border-line"} />
                  {s ? (
                    <span className="tracking-normal whitespace-nowrap tabular-nums">
                      <span aria-hidden="true">{formatTime(s.start).replace(" ", "")}</span>
                      <span className="sr-only">{`${day} ${formatTime(s.start)}`}</span>
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : null}
      </Step>

      <Step n={2} title="Book your place">
        {price ? (
          <p className="flex flex-wrap items-baseline gap-x-2.5">
            <strong className="font-display text-[2.5rem] leading-none font-bold tracking-tight">£{price.amountGbp}</strong>
            <span>
              a class, or less with a{" "}
              <Link href="/memberships" className="font-semibold underline underline-offset-4 hover:no-underline">
                membership
              </Link>
            </span>
          </p>
        ) : null}
        <ul aria-label="How to pay" className="flex flex-wrap gap-2">
          {payBy.map((m) => (
            <li key={m} className="rounded-full border border-line px-3 py-1.5 text-[0.8125rem] font-semibold">
              {m}
            </li>
          ))}
        </ul>
        {beginners ? <p>{beginners}</p> : null}
      </Step>

      <Step n={3} title="Turn up and train" last>
        <div className="flex items-start gap-3.5">
          <svg viewBox="0 0 26 34" aria-hidden="true" className="h-[2.125rem] w-[1.625rem] flex-none">
            <path className="ln" pathLength={1} d="M13 32s11-11 11-19A11 11 0 0 0 2 13c0 8 11 19 11 19z" />
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
            <a href={mapsUrl()} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center font-semibold underline underline-offset-4 hover:no-underline">
              Directions<span className="sr-only"> to {l.venue} (opens in a new tab)</span>
            </a>
          </div>
        </div>
        {firstSession ? <p>{firstSession}</p> : null}
        {bring ? (
          <>
            <ul aria-label="What to bring" className="grid grid-cols-2 gap-x-2 gap-y-4 min-[381px]:grid-cols-4">
              {bring.map((item, i) => (
                <li key={item} className="flex min-w-0 flex-col items-center gap-2 text-center text-[0.8125rem] leading-tight">
                  <svg viewBox="0 0 34 34" aria-hidden="true" className="size-[2.125rem]">
                    {BRING_ICONS[i]}
                  </svg>
                  {item}
                </li>
              ))}
            </ul>
            <p>{lines.provided}</p>
          </>
        ) : null}
      </Step>
    </ol>
  );
}
