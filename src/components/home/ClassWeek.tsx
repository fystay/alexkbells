"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { buttonClasses } from "@/components/ui/ButtonLink";
import { cn } from "@/lib/cn";
import { useClassStatus } from "@/components/classes/useClassStatus";

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
}

const DAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"];
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

function untilText(mins: number): string {
  if (mins <= 0) return "on now";
  const d = Math.floor(mins / 1440);
  const h = Math.floor((mins % 1440) / 60);
  const m = mins % 60;
  if (d > 0) return `in ${d} d ${h} h`;
  if (h > 0) return `in ${h} h ${m} min`;
  return `in ${m} min`;
}

function dateIn(mins: number): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", day: "numeric", month: "long" }).format(new Date(Date.now() + mins * 60_000));
}

/**
 * The home page's class times (owner's design, 2026-10-28): a week strip with
 * the class days marked (today underlined, the chosen day ringed), three class
 * cards under a sliding ink selector with "Next up" (or "On now") on the next
 * class, the facts, a separate "Where we train" panel, then Book now (always
 * that label, owner rule), which opens the calendar on the chosen class. The
 * next class is chosen to begin with. Times come from the timetable; the
 * countdown is worked out in the visitor's browser in UK time.
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
  /** Book now with a class chosen: `<base><timetable id>` opens the calendar on it (null where booking goes elsewhere). */
  classHrefBase: string | null;
  address: { venue: string; lines: string[]; postcode: string };
  mapsHref: string;
  beginners: string | null;
}) {
  const tick = useSyncExternalStore(subscribe, getTick, getServerTick);
  const [choice, setChoice] = useState<number | null>(null);
  const now = tick === null ? null : ukNow();
  const deltas = now
    ? classes.map((c) => {
        let x = c.dayIndex * 1440 + c.start - now.mins;
        if (x < -c.durationMinutes) x += WEEK; // finished this week
        return x;
      })
    : null;
  const next = deltas ? deltas.indexOf(Math.min(...deltas)) : null;
  const status = useClassStatus(classes.map((c) => ({ id: c.id, day: c.day, start: c.startTime })));
  const wanted = choice ?? next ?? 0;
  // A fully booked class sends people to the next class with a place, and says so.
  const fullChoice = status?.get(classes[wanted].id);
  const redirect = fullChoice?.full ? fullChoice.redirect : null;
  const redirectIndex = redirect ? classes.findIndex((c) => c.id === redirect.id) : -1;
  const sel = redirectIndex >= 0 ? redirectIndex : wanted;
  const chosen = classes[sel];
  const href = classHrefBase ? `${classHrefBase}${chosen.id}${redirect ? `&date=${redirect.date}` : ""}` : bookHref;
  const button = buttonClasses("action", "w-full px-6");

  return (
    <div>
      <ol aria-hidden="true" className="ct-week grid grid-cols-7 gap-1 pt-1">
        {DAY_LETTERS.map((letter, i) => {
          const isClass = classes.some((c) => c.dayIndex === i);
          return (
            <li key={i} className={cn("flex flex-col items-center gap-2 text-xs font-semibold tracking-[0.12em]", isClass ? "text-ink" : "text-grey")}>
              <b className={cn("font-semibold", now?.day === i && "underline decoration-2 underline-offset-4")}>{letter}</b>
              <span className="flex h-[13px] items-center">
              <i
                className={cn(
                  "relative z-10 block rounded-full border-[1.5px]",
                  isClass ? "size-[13px] border-ink bg-ink" : "size-[9px] border-grey bg-paper",
                  chosen.dayIndex === i && "shadow-[0_0_0_5px_var(--color-paper),0_0_0_6.5px_var(--color-ink)]",
                )}
              />
              </span>
            </li>
          );
        })}
      </ol>

      <ul aria-label="Class times" className="ct-cards relative mt-6 grid grid-cols-3 gap-3">
        <li aria-hidden="true" className="ct-pill" style={{ transform: `translateX(calc(${sel} * (100% + 0.75rem)))` }} />
        {classes.map((c, i) => {
          const [time, period] = c.time.split(" ");
          const isNext = next === i;
          const isFull = status?.get(c.id)?.full ?? false;
          return (
            <li key={c.id} className="relative min-w-0">
              <button
                type="button"
                aria-pressed={sel === i}
                aria-label={`${c.day} ${c.time}`}
                onClick={() => setChoice(i)}
                className={cn(
                  "flex w-full cursor-pointer flex-col items-center gap-0.5 rounded-[1.375rem] border-[1.5px] border-ink px-1.5 pt-5 pb-4 motion-safe:transition-colors motion-safe:duration-300",
                  "focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-ink",
                  sel === i ? "text-paper" : "text-ink",
                )}
              >
                <span className="text-[0.8125rem] font-semibold tracking-[0.24em] uppercase">{c.day.slice(0, 3)}</span>
                <span className="font-display text-[clamp(1.75rem,8vw,2.5rem)] leading-[1.15] tabular-nums">{time}</span>
                <span className="text-[0.9375rem]">{period}</span>
                <span className={cn("mt-2 rounded-full border border-current px-2 py-0.5 text-[0.6875rem] font-semibold tracking-[0.1em] whitespace-nowrap uppercase", isFull && "px-1.5 text-[0.625rem] tracking-[0.04em]", !isNext && !isFull && "invisible")}>
                  {isFull ? "Fully booked" : isNext ? (deltas && deltas[i] <= 0 ? "On now" : "Next up") : "\u00a0"}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <p className="mt-6 flex flex-wrap justify-between gap-3 border-y border-line py-4 tabular-nums">
        {facts.map((f) => (
          <span key={f}>{f}</span>
        ))}
      </p>

      <section aria-labelledby="ct-venue" className="mt-6 grid grid-cols-[auto_1fr] items-start gap-x-[1.125rem] gap-y-4 rounded-[1.375rem] bg-white px-5 py-[1.375rem]">
        <svg viewBox="0 0 34 44" aria-hidden="true" className="ct-pin h-11 w-[2.125rem]">
          <path d="M17 42s14-14.5 14-25A14 14 0 0 0 3 17c0 10.5 14 25 14 25z" fill="none" stroke="currentColor" strokeWidth="2.2" />
          <circle cx="17" cy="17" r="5" fill="currentColor" />
        </svg>
        <div className="min-w-0">
          <p className="eyebrow mb-1.5">Where we train</p>
          <p id="ct-venue" className="text-xl font-extrabold tracking-[-0.01em]">
            {address.venue}
          </p>
          <address className="mt-1 leading-normal not-italic">
            {address.lines.map((l) => (
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
          Get directions<span className="sr-only"> to {address.venue} (opens in a new tab)</span>
        </a>
      </section>

      <div className="mt-6">
        {external ? (
          <a href={href} target="_blank" rel="noopener noreferrer" className={button}>
            {bookLabel}
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        ) : (
          <Link href={href} className={button}>
            {bookLabel}
          </Link>
        )}
        <p aria-live="polite" className="mt-3">
          {fullChoice?.full ? (
            <>
              {classes[wanted].day} {classes[wanted].time} is fully booked.{" "}
              {redirect ? <>We&apos;ve picked the next class, {redirect.day} {classes[sel].time}. </> : "There are no places in the next four weeks. "}
            </>
          ) : null}
          {deltas ? (
            <>
              {chosen.day} {dateIn(Math.max(deltas[sel], 0))}, {chosen.time} selected <span className="tabular-nums">({untilText(deltas[sel])})</span>. Next, add your details.
            </>
          ) : (
            <>
              {chosen.day} {chosen.time} selected. Next, add your details.
            </>
          )}
        </p>
        <p className="mt-2">
          {beginners ? `${beginners} ` : null}
          <Link href="#memberships" className="font-semibold underline underline-offset-4 hover:no-underline">
            Save with a membership
          </Link>
        </p>
      </div>
    </div>
  );
}
