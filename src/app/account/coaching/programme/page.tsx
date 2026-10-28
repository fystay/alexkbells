import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AccountUnavailable } from "@/components/members/Cards";
import { CoachingShell } from "@/components/members/CoachingShell";
import { WeekBar } from "@/components/members/WeekBar";
import { COACHING_MESSAGES_PATH, COACHING_PATH, COACHING_UNLOCK_PATH, daysOf, itemsOf, logOf, sessionsDone, statusOf, weekStart } from "@/lib/coaching";
import { formatDayMonth } from "@/lib/coach/time";
import { pageMetadata } from "@/lib/metadata";
import { shortWhen } from "@/lib/member-view";
import { loadCoaching } from "../../data";

export const metadata: Metadata = pageMetadata({
  title: "Coaching: programme",
  description: "Your coaching programme, week by week.",
  path: "/account/coaching/programme",
  noindex: true,
});

const weekday = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", weekday: "short" });

/** "Mon 12 Oct" for the start of programme week w. */
function startLabel(startsOn: string, w: number): string {
  const key = weekStart(startsOn, w);
  return `${weekday.format(new Date(`${key}T00:00:00Z`))} ${formatDayMonth(key)}`;
}

/**
 * Coaching Programme (owner's members design): the goal and start, then every
 * week: finished weeks with how many sessions were logged, this week with its
 * days (each opens that day's workout), later weeks with when they open; then
 * the recent sessions logged.
 */
export default async function CoachingProgrammePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const d = await loadCoaching(searchParams);
  if (!d.overview.ok || !d.coaching) return <AccountUnavailable />;
  const c = d.coaching;
  if (!c.active) redirect(COACHING_UNLOCK_PATH);
  const p = c.programme;
  const shell = { overview: d.overview.data, settings: d.settings, coaching: statusOf(c), unread: c.unread, done: d.done, error: d.error };

  if (!p) {
    return (
      <CoachingShell view="programme" {...shell}>
        <div className="flex flex-col gap-2">
          <p className="members-eyebrow">Your programme</p>
          <h1 className="text-[clamp(1.875rem,8.4vw,2.625rem)] leading-[1.05] font-extrabold tracking-[-0.035em] text-balance">On its way.</h1>
          <p>Alex is writing it for you. It will appear here.</p>
        </div>
        <Link href={COACHING_MESSAGES_PATH} className="members-btn members-btn-solid w-full sm:w-auto">
          Message Alex
        </Link>
      </CoachingShell>
    );
  }

  const recent = c.logs.slice(0, 5);
  return (
    <CoachingShell view="programme" {...shell}>
      <div className="flex flex-col gap-2">
        <p className="members-eyebrow">Your programme</p>
        <h1 className="text-[clamp(1.875rem,8.4vw,2.625rem)] leading-[1.05] font-extrabold tracking-[-0.035em] text-balance">{p.name}.</h1>
        <p>
          Written by Alex for you. {p.weeks} week{p.weeks === 1 ? "" : "s"}, {p.days_per_week} day{p.days_per_week === 1 ? "" : "s"} a week.
        </p>
        <WeekBar week={p.week} of={p.weeks} />
      </div>

      <dl className="border-t border-line">
        {([...(p.goal ? ([["Goal", p.goal]] as const) : []), ["Started", startLabel(p.starts_on, 1)]] as readonly (readonly [string, string])[]).map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4 border-b border-line py-3.5">
            <dt>{k}</dt>
            <dd className="min-w-0 text-right font-semibold [overflow-wrap:anywhere]">{v}</dd>
          </div>
        ))}
      </dl>

      <section aria-labelledby="weeks-heading" className="flex flex-col gap-3">
        <h2 id="weeks-heading" className="members-eyebrow">
          Weeks
        </h2>
        <ul className="border-t border-line">
          {Array.from({ length: p.weeks }, (_, i) => i + 1).map((w) => {
            const sessions = sessionsDone(c, w);
            if (w < p.week) {
              return (
                <li key={w} className="flex items-center justify-between gap-3 border-b border-line py-4">
                  <div className="flex flex-col">
                    <b>Week {w}</b>
                    <span className="text-sm">{sessions > 0 ? `${sessions} of ${p.days_per_week} sessions` : "No sessions logged"}</span>
                  </div>
                  <span className="rounded-full border border-current px-2.5 py-0.5 text-[0.6875rem] font-semibold tracking-[0.1em] uppercase">Done</span>
                </li>
              );
            }
            if (w === p.week) {
              return (
                <li key={w} className="flex flex-col gap-3.5 border-b border-line py-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex flex-col">
                      <b>Week {w}</b>
                      <span className="text-sm">
                        From {startLabel(p.starts_on, w)} · {sessions} of {p.days_per_week} sessions
                      </span>
                    </div>
                    <span className="rounded-full border border-current px-2.5 py-0.5 text-[0.6875rem] font-semibold tracking-[0.1em] uppercase">This week</span>
                  </div>
                  <ul className="flex flex-col gap-2">
                    {daysOf(p, w).map((day) => (
                      <li key={day}>
                        <Link href={`${COACHING_PATH}?day=${encodeURIComponent(day)}`} className="grid grid-cols-[1fr_auto] items-center gap-x-3 rounded-2xl border border-line px-4 py-3.5 hover:border-ink">
                          <b>{day}</b>
                          <span className="row-span-2 rounded-full border border-current px-2.5 py-0.5 text-[0.6875rem] font-semibold tracking-[0.1em] uppercase">{logOf(c, w, day) ? "Logged" : "To do"}</span>
                          <span className="text-sm">{itemsOf(p, w, day).map((i) => i.name).join(", ")}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </li>
              );
            }
            return (
              <li key={w} className="flex items-center justify-between gap-3 border-b border-line py-4">
                <div className="flex flex-col">
                  <b>Week {w}</b>
                  <span className="text-sm">Opens {startLabel(p.starts_on, w)}</span>
                </div>
                {w === p.weeks && p.weeks > 1 ? <span className="rounded-full border border-current px-2.5 py-0.5 text-[0.6875rem] font-semibold tracking-[0.1em] uppercase">Last week</span> : null}
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="recent-heading" className="flex flex-col gap-3">
        <h2 id="recent-heading" className="members-eyebrow">
          Recent sessions
        </h2>
        {recent.length === 0 ? (
          <p className="border-y border-line py-4">No sessions logged yet.</p>
        ) : (
          <ul className="border-t border-line">
            {recent.map((l) => (
              <li key={l.id} className="flex flex-col border-b border-line py-3.5">
                <b>
                  Week {l.week} · {l.day}
                </b>
                <span className="text-sm">
                  {shortWhen(l.logged_at)} · {l.sets.filter((s) => s.done).length} sets
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </CoachingShell>
  );
}
