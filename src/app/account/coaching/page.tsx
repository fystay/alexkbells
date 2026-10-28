import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AccountUnavailable } from "@/components/members/Cards";
import { CoachingShell } from "@/components/members/CoachingShell";
import { WorkoutForm, type WorkoutExercise } from "@/components/members/WorkoutForm";
import { chosenDay, COACHING_CHECK_IN_PATH, COACHING_MESSAGES_PATH, COACHING_PATH, COACHING_UNLOCK_PATH, daysOf, itemsOf, lastWeekFor, logOf, sessionsDone, statusOf, summariseLog, totalSets } from "@/lib/coaching";
import { pageMetadata } from "@/lib/metadata";
import { shortWhen } from "@/lib/member-view";
import { WeekBar } from "@/components/members/WeekBar";
import { loadCoaching } from "../data";

export const metadata: Metadata = pageMetadata({
  title: "Coaching: today",
  description: "Your coaching session today.",
  path: "/account/coaching",
  noindex: true,
});

/**
 * Coaching Today (owner's members design, 2026-10-28): just the workout. A
 * strip with the sessions done this week and the check-in, the programme's
 * days as tabs, then each exercise with its sets to log (weight, reps, tick),
 * last week's numbers and a demo link where Alex added one; or, once the day is
 * logged, what was logged. Without a programme yet it says Alex is writing it.
 */
export default async function CoachingTodayPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const d = await loadCoaching(searchParams);
  if (!d.overview.ok || !d.coaching) return <AccountUnavailable />;
  const c = d.coaching;
  if (!c.active) redirect(COACHING_UNLOCK_PATH);
  const p = c.programme;
  const shell = { overview: d.overview.data, settings: d.settings, coaching: statusOf(c), unread: c.unread, done: d.done, error: d.error };

  if (!p) {
    return (
      <CoachingShell view="today" {...shell}>
        <div className="flex flex-col gap-2">
          <p className="members-eyebrow">Today</p>
          <h1 className="text-[clamp(1.875rem,8.4vw,2.625rem)] leading-[1.05] font-extrabold tracking-[-0.035em] text-balance">Your programme is on its way.</h1>
          <p>Alex is writing it. It will appear here, and you can message him in the meantime.</p>
        </div>
        <Link href={COACHING_MESSAGES_PATH} className="members-btn members-btn-solid w-full sm:w-auto">
          Message Alex
        </Link>
      </CoachingShell>
    );
  }

  const day = chosenDay(c, p, d.day);
  const days = daysOf(p, p.week);
  const items = itemsOf(p, p.week, day);
  const log = logOf(c, p.week, day);
  const showForm = !log || d.relog;
  const done = sessionsDone(c, p.week);
  const exercises: WorkoutExercise[] = items.map((i) => ({
    id: i.id,
    name: i.name,
    sets: i.sets,
    reps: i.reps,
    load: i.load,
    note: i.note,
    videoUrl: i.video_url,
    last: lastWeekFor(c, p.week, day, i.name),
    logged: d.relog && log ? Array.from({ length: i.sets }, (_, s) => {
      const x = log.sets.find((l) => l.item_id === i.id && l.set_no === s + 1);
      return [x?.load ?? "", x?.reps ?? "", x?.done ?? false] as [string, string, boolean];
    }) : undefined,
  }));

  return (
    <CoachingShell view="today" {...shell}>
      <div className="flex flex-col gap-2">
        <p className="members-eyebrow">Today · {p.name}</p>
        <h1 className="text-[clamp(1.875rem,8.4vw,2.625rem)] leading-[1.05] font-extrabold tracking-[-0.035em] text-balance">
          Week {p.week}, {day}.
        </h1>
        <p>
          {items.length} exercise{items.length === 1 ? "" : "s"} · {totalSets(items)} sets · programmed by Alex
        </p>
        <WeekBar week={p.week} of={p.weeks} />
      </div>

      <div className="flex items-center justify-between gap-3 border-y border-line py-3 text-sm">
        <span>
          <b>
            {done} of {p.days_per_week}
          </b>{" "}
          sessions this week
        </span>
        {c.check_in_sent ? <span>Check-in sent</span> : (
          <Link href={COACHING_CHECK_IN_PATH} className="members-link">
            Check-in due
          </Link>
        )}
      </div>

      <nav aria-label="Training day" className="flex flex-wrap gap-2">
        {days.map((x) => (
          <Link key={x} href={`${COACHING_PATH}?day=${encodeURIComponent(x)}`} aria-current={x === day ? "page" : undefined} className="members-chip aria-[current=page]:border-ink aria-[current=page]:bg-ink aria-[current=page]:text-paper">
            {x}
            {logOf(c, p.week, x) ? <span className="sr-only">, logged</span> : <span className="sr-only">, to do</span>}
            {logOf(c, p.week, x) ? <span aria-hidden="true" className="ml-1.5">✓</span> : null}
          </Link>
        ))}
      </nav>

      {showForm ? (
        <WorkoutForm key={`${p.week}-${day}-${d.relog}`} week={p.week} day={day} coach="Alex" exercises={exercises} note={d.relog && log ? log.note : ""} />
      ) : (
        <section aria-labelledby="logged-heading" className="flex flex-col gap-3 rounded-3xl border-[1.5px] border-ink p-5.5">
          <h2 id="logged-heading" className="members-eyebrow">
            Logged {log ? shortWhen(log.logged_at) : ""}
          </h2>
          <ul className="flex flex-col gap-1.5">
            {log ? summariseLog(log, p).map((line) => <li key={line}>{line}</li>) : null}
          </ul>
          {log?.note ? <p>“{log.note}”</p> : null}
          <Link href={`${COACHING_PATH}?day=${encodeURIComponent(day)}&relog=1`} className="members-link self-start">
            Log it again
          </Link>
        </section>
      )}
    </CoachingShell>
  );
}
