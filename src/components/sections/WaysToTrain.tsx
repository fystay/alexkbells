import Link from "next/link";
import { timetable } from "@/content/classes";
import { Provisional } from "@/components/ui/Provisional";
import { formatTime, partOfDay, shortDay, sortSessions } from "@/lib/schedule";
import { cn } from "@/lib/cn";

interface TimetableProps {
  tone?: "paper" | "ink";
  /** Heading id the list is described by. */
  labelledBy?: string;
  /** "row": three across from sm (full-width sections). "stack": one per row (narrow columns, e.g. a service card). */
  layout?: "row" | "stack";
}

/** Shown in place of the timetable until it is confirmed. */
export function TimetableFallback({ tone = "paper" }: { tone?: "paper" | "ink" }) {
  const muted = tone === "ink" ? "text-muted-inverse" : "text-muted";
  return (
    <p className={cn("max-w-xl text-lede", muted)}>
      The class timetable is being finalised.{" "}
      <Link href="/contact" className={cn("underline underline-offset-4", tone === "ink" ? "text-paper" : "text-ink")}>
        Get in touch
      </Link>{" "}
      for current class times.
    </p>
  );
}

export function Timetable({ tone = "paper", labelledBy, layout = "row" }: TimetableProps) {
  const stack = layout === "stack";
  const sessions = sortSessions(timetable.sessions);
  const line = tone === "ink" ? "border-line-inverse" : "border-ink";
  const muted = tone === "ink" ? "text-muted-inverse" : "text-muted";

  return (
    <Provisional status={timetable.status} fallback={<TimetableFallback tone={tone} />}>
      <ul aria-labelledby={labelledBy} className={cn("grid grid-cols-1 gap-px", !stack && "sm:grid-cols-3")}>
        {sessions.map((session) => (
          <li key={session.id} className={cn("border-t-2", stack ? "pt-3 pb-4 lg:py-3" : "pt-3 pb-4 sm:pt-4 sm:pb-5 sm:pr-6", line)}>
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
            {session.durationMinutes ? <p className={cn("mt-1 text-sm", muted)}>{session.durationMinutes} minutes</p> : null}
          </li>
        ))}
      </ul>
    </Provisional>
  );
}

