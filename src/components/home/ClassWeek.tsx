"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { buttonClasses } from "@/components/ui/ButtonLink";
import { cn } from "@/lib/cn";
import { useClassStatus, useUsualClassSize } from "@/components/classes/useClassStatus";

export interface WeekClass {
  id: string;
  /** "Monday" */
  day: string;
  /** 0 = Monday … 6 = Sunday */
  dayIndex: number;
  /** Minutes after midnight, UK time. */
  start: number;
  /** "6:30 pm" */
  time: string;
  /** "18:30" */
  startTime: string;
  durationMinutes: number;
  /** "HIIT" and its one line, from Alex's mockup; null where not given. */
  name: string | null;
  description: string | null;
}

const WEEK = 7 * 1440;

/** Re-reads the clock every 30 s on the client; null while server rendering. */
const subscribe = (tick: () => void) => {
  const t = window.setInterval(tick, 30_000);
  return () => window.clearInterval(t);
};
const getTick = () => Math.floor(Date.now() / 30_000);
const getServerTick = () => null;

function ukNow(): { day: number; mins: number } {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
      .formatToParts(new Date())
      .map((p) => [p.type, p.value]),
  );
  const day = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(parts.weekday);
  return { day, mins: day * 1440 + Number(parts.hour) * 60 + Number(parts.minute) };
}

const pill = "rounded-full border border-current px-2 py-0.5 text-[0.6875rem] leading-tight font-semibold tracking-[0.1em] whitespace-nowrap uppercase";

/**
 * The home page's class times, kept simple (Alex via the owner, 2026-10-29: "so
 * people know exactly what days and times"): each class as a row (day, time,
 * "Next up" on the next one), the facts, one Book now that opens the booking
 * calendar, and the address with Get directions (no second Book now there).
 * A row opens the calendar on that class; a fully booked class says so and its
 * row opens the next class with a place. Times come from the timetable; "Next
 * up" is worked out in the visitor's browser in UK time.
 */
export function ClassWeek({
  classes,
  facts,
  bookHref,
  bookLabel,
  external,
  classHrefBase,
  address,
  mapsHref,
  beginners,
}: {
  classes: WeekClass[];
  facts: string[];
  bookHref: string;
  bookLabel: string;
  external?: boolean;
  /** A row opens the calendar on its class: `<base><timetable id>` (null where booking goes elsewhere). */
  classHrefBase: string | null;
  address: { venue: string; lines: string[]; postcode: string };
  mapsHref: string;
  beginners: string | null;
}) {
  const tick = useSyncExternalStore(subscribe, getTick, getServerTick);
  const size = useUsualClassSize();
  const status = useClassStatus(classes.map((c) => ({ id: c.id, day: c.day, start: c.startTime })));
  const now = tick === null ? null : ukNow();
  const deltas = now
    ? classes.map((c) => {
        let x = c.dayIndex * 1440 + c.start - now.mins;
        if (x < -c.durationMinutes) x += WEEK; // finished this week
        return x;
      })
    : null;
  const next = deltas ? deltas.indexOf(Math.min(...deltas)) : null;
  const button = buttonClasses("action", "w-full px-6");
  const [street, ...rest] = address.lines;

  return (
    <div>
      <ul aria-label="Class times" className="border-y border-line">
        {classes.map((c, i) => {
          const s = status?.get(c.id);
          const isFull = s?.full ?? false;
          const redirect = isFull ? s?.redirect : null;
          const href = classHrefBase ? (redirect ? `${classHrefBase}${redirect.id}&date=${redirect.date}` : `${classHrefBase}${c.id}`) : null;
          const label = isFull ? "Fully booked" : next === i ? (deltas && deltas[i] <= 0 ? "On now" : "Next up") : null;
          const body = (
            <>
              <span className="flex min-w-0 flex-col gap-1">
                <span className="flex items-baseline gap-3">
                  <span className="text-sm font-semibold tracking-[0.16em] uppercase">{c.day.slice(0, 3)}</span>
                  <span className={cn("font-display text-[1.75rem] leading-none tabular-nums", isFull && "text-grey")}>{c.time}</span>
                </span>
                {c.name ? (
                  <span className="mt-1">
                    <span className="block font-semibold">{c.name}</span>
                    {c.description ? <span className="block text-[0.9375rem]">{c.description}</span> : null}
                  </span>
                ) : null}
              </span>
              <span className="flex shrink-0 flex-col items-end gap-1 text-right">
                {label ? <span className={pill}>{label}</span> : null}
                {isFull ? <span className="text-sm">{redirect ? `Next: ${redirect.day.slice(0, 3)} ${classes.find((x) => x.id === redirect.id)?.time}` : "No places for 4 weeks"}</span> : null}
              </span>
            </>
          );
          const row = "flex min-h-16 items-start justify-between gap-4 py-4";
          return (
            <li key={c.id} className={cn(i > 0 && "border-t border-line")}>
              {href ? (
                <Link href={href} aria-label={`${c.day} ${c.time}${isFull ? ", fully booked" : ""}`} className={cn(row, "hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink")}>
                  {body}
                </Link>
              ) : (
                <div className={row}>{body}</div>
              )}
            </li>
          );
        })}
      </ul>

      <p className="mt-5 flex flex-wrap justify-between gap-3 tabular-nums">
        {[...facts, ...(size ? [`${size} places max`] : [])].map((f) => (
          <span key={f}>{f}</span>
        ))}
      </p>

      <div className="mt-6">
        {external ? (
          <a href={bookHref} target="_blank" rel="noopener noreferrer" className={button}>
            {bookLabel}
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        ) : (
          <Link href={bookHref} className={button}>
            {bookLabel}
            <span aria-hidden="true"> →</span>
          </Link>
        )}
        <p className="mt-3">
          {beginners ? `${beginners} ` : null}
          <Link href="#memberships" className="font-semibold underline underline-offset-4 hover:no-underline">
            Save with a membership
          </Link>
        </p>
      </div>

      <section aria-labelledby="ct-venue" className="mt-8 grid grid-cols-[auto_1fr] items-start gap-x-[1.125rem] gap-y-4 rounded-[1.375rem] bg-white px-5 py-[1.375rem]">
        <svg viewBox="0 0 34 44" aria-hidden="true" className="ct-pin h-11 w-[2.125rem]">
          <path d="M17 42s14-14.5 14-25A14 14 0 0 0 3 17c0 10.5 14 25 14 25z" fill="none" stroke="currentColor" strokeWidth="2.2" />
          <circle cx="17" cy="17" r="5" fill="currentColor" />
        </svg>
        <div className="min-w-0">
          <p className="eyebrow mb-1.5">Where we train</p>
          <p id="ct-venue" className="text-xl font-extrabold tracking-[-0.01em]">
            {street}
          </p>
          <address className="mt-1 leading-normal not-italic">
            {rest.map((l) => (
              <span key={l} className="block">
                {l}
              </span>
            ))}
            <span className="block font-semibold tracking-[0.06em]">{address.postcode}</span>
          </address>
        </div>
        <a
          href={mapsHref}
          target="_blank"
          rel="noopener noreferrer"
          className="col-span-2 flex min-h-12 items-center justify-center rounded-full border-[1.5px] border-ink px-5 font-semibold hover:bg-ink hover:text-paper motion-safe:transition-colors"
        >
          Get directions<span className="sr-only"> to the class location (opens in a new tab)</span>
        </a>
      </section>
    </div>
  );
}
