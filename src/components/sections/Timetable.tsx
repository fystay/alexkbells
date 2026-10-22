import Link from "next/link";
import { timetable } from "@/content/classes";
import { Provisional } from "@/components/ui/Provisional";
import { formatTime, partOfDay, shortDay, sortSessions } from "@/lib/schedule";
import { cn } from "@/lib/cn";

interface TimetableProps {
  /** Heading id the list is described by. */
  labelledBy?: string;
  /**
   * "row": three across from sm (full-width sections). "stack": one per row
   * (narrow columns). "compact": one slim line per session (day left, time
   * right), for cards that need to stay short. "mini": the "row" style
   * (part of day, day, time) scaled down to three small columns for a card.
   */
  layout?: "row" | "stack" | "compact" | "mini";
}

/** Shown in place of the timetable until it is confirmed. */
export function TimetableFallback() {
  const muted = "";
  return (
    <p className={cn("max-w-xl text-lede", muted)}>
      The class timetable is being finalised.{" "}
      <Link href="/contact" className="underline underline-offset-4">
        Send a message
      </Link>{" "}
      for current class times.
    </p>
  );
}

export function Timetable({ labelledBy, layout = "row" }: TimetableProps) {
  const stack = layout === "stack";
  const sessions = sortSessions(timetable.sessions);
  const line = "border-grey";
  const muted = "";

  if (layout === "mini") {
    return (
      <Provisional status={timetable.status} fallback={<TimetableFallback />}>
        <ul aria-labelledby={labelledBy} className="grid grid-cols-3 gap-3">
          {sessions.map((session) => (
            <li key={session.id} className={cn("border-t pt-3", line)}>
              <p className={cn("eyebrow text-[0.625rem]", muted)}>{partOfDay(session.start)}</p>
              <p className="mt-1.5 font-display text-xl">
                <span aria-hidden="true">{shortDay(session.day)}</span>
                <span className="sr-only">{session.day}</span>
              </p>
              <p className="text-sm font-semibold tabular-nums">
                <time dateTime={session.start}>{formatTime(session.start)}</time>
              </p>
            </li>
          ))}
        </ul>
      </Provisional>
    );
  }

  if (layout === "compact") {
    return (
      <Provisional status={timetable.status} fallback={<TimetableFallback />}>
        <ul aria-labelledby={labelledBy}>
          {sessions.map((session) => (
            <li key={session.id} className={cn("flex items-baseline justify-between gap-4 border-t py-2.5", line)}>
              <span className="font-semibold">{session.day}</span>
              <span className="tabular-nums">
                <span className="sr-only">{partOfDay(session.start)}, </span>
                <time dateTime={session.start}>{formatTime(session.start)}</time>
                {session.durationMinutes ? <span className={cn("ml-2 text-sm", muted)}>{session.durationMinutes} min</span> : null}
              </span>
            </li>
          ))}
        </ul>
      </Provisional>
    );
  }

  return (
    <Provisional status={timetable.status} fallback={<TimetableFallback />}>
      <ul aria-labelledby={labelledBy} className={cn("grid grid-cols-1 gap-px", !stack && "sm:grid-cols-3")}>
        {sessions.map((session) => (
          <li key={session.id} className={cn("border-t-2", stack ? "pt-4 pb-5 lg:py-4" : "pt-4 pb-5 sm:pt-5 sm:pb-6 sm:pr-6", line)}>
            {/* In the narrow desktop card the time says enough; the label stays for screen readers. */}
            <p className={cn("eyebrow", muted, stack && "lg:sr-only")}>{partOfDay(session.start)}</p>
            {stack ? (
              // Day and time on one line, so a narrow card stays compact.
              <p className="mt-2 flex flex-wrap items-baseline justify-between gap-x-4 lg:mt-0">
                <span className="font-display text-h2 lg:text-h3">{session.day}</span>
                <time dateTime={session.start} className="text-2xl font-semibold tabular-nums">
                  {formatTime(session.start)}
                </time>
              </p>
            ) : (
              // Phones: day and time on one line, as in the stacked card. From sm: three columns, time below.
              <div className="mt-2 flex flex-wrap items-baseline justify-between gap-x-4 sm:mt-3 sm:block">
                <p className="font-display text-h2">
                  <span aria-hidden="true" className="sm:hidden lg:inline">
                    {session.day}
                  </span>
                  <span aria-hidden="true" className="hidden sm:inline lg:hidden">
                    {shortDay(session.day)}
                  </span>
                  <span className="sr-only">{session.day}</span>
                </p>
                <p className="text-2xl font-semibold tabular-nums sm:mt-2">
                  <time dateTime={session.start}>{formatTime(session.start)}</time>
                </p>
              </div>
            )}
            {session.durationMinutes ? (
              <p className={cn("mt-1 text-sm", muted)}>{session.durationMinutes} minutes</p>
            ) : null}
          </li>
        ))}
      </ul>
    </Provisional>
  );
}
