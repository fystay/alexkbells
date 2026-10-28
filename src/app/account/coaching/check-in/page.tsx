import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AccountUnavailable } from "@/components/members/Cards";
import { CoachingShell } from "@/components/members/CoachingShell";
import { COACHING_UNLOCK_PATH, statusOf, type CoachingCheckIn } from "@/lib/coaching";
import { pageMetadata } from "@/lib/metadata";
import { shortWhen } from "@/lib/member-view";
import { loadCoaching } from "../../data";
import { sendCheckIn } from "../actions";

export const metadata: Metadata = pageMetadata({
  title: "Coaching: check-in",
  description: "Your weekly coaching check-in.",
  path: "/account/coaching/check-in",
  noindex: true,
});

const SCALES = [
  { name: "energy", label: "Energy", low: "Flat", high: "Full of beans" },
  { name: "sleep", label: "Sleep", low: "Poor", high: "Great" },
  { name: "training", label: "Training", low: "Hard going", high: "Felt great" },
] as const;

/**
 * Coaching Check-in (owner's members design): once a week, energy, sleep and
 * training scored 1 to 5, wins, what was hard, and an optional link to a form
 * video (a link only: never an upload). Once sent for the week the form is
 * replaced by what was sent. Past check-ins show with Alex's reply.
 */
export default async function CoachingCheckInPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const d = await loadCoaching(searchParams);
  if (!d.overview.ok || !d.coaching) return <AccountUnavailable />;
  const c = d.coaching;
  if (!c.active) redirect(COACHING_UNLOCK_PATH);
  const shell = { overview: d.overview.data, settings: d.settings, coaching: statusOf(c), unread: c.unread, done: d.done, error: d.error };
  const thisWeek: CoachingCheckIn | undefined = c.check_ins.find((x) => x.week_of === c.week_of);
  const week = c.programme?.week;

  return (
    <CoachingShell view="check-in" {...shell}>
      <div className="flex flex-col gap-2">
        <p className="members-eyebrow">Weekly check-in{week ? ` · Week ${week}` : ""}</p>
        <h1 className="text-[clamp(1.875rem,8.4vw,2.625rem)] leading-[1.05] font-extrabold tracking-[-0.035em] text-balance">{thisWeek ? "Sent. Nice work." : "How was your week?"}</h1>
        {thisWeek ? null : <p>Alex reads every one and adjusts your next week.</p>}
      </div>

      {thisWeek ? (
        <section aria-label="This week's check-in" className="flex flex-col gap-2 rounded-3xl border-[1.5px] border-ink p-5.5">
          <p className="members-eyebrow">Sent {shortWhen(thisWeek.created_at)}</p>
          <p>
            Energy {thisWeek.energy} · Sleep {thisWeek.sleep} · Training {thisWeek.training}
          </p>
          {thisWeek.wins ? <p>“{thisWeek.wins}”</p> : null}
          <p className="text-sm">You&apos;ll see Alex&apos;s reply here and in Messages.</p>
        </section>
      ) : (
        <form action={sendCheckIn} className="flex flex-col gap-6">
          {SCALES.map((s) => (
            <fieldset key={s.name} className="flex flex-col gap-2">
              <legend className="mb-2 font-semibold">{s.label}</legend>
              <div className="coaching-scale grid grid-cols-5 gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <label key={n}>
                    <input type="radio" name={s.name} value={n} required />
                    <span aria-hidden="true">{n}</span>
                    <span className="sr-only">
                      {s.label} {n} of 5
                    </span>
                  </label>
                ))}
              </div>
              <div className="flex justify-between text-sm">
                <span>{s.low}</span>
                <span>{s.high}</span>
              </div>
            </fieldset>
          ))}
          <label className="flex flex-col gap-1.5">
            <span className="font-semibold">Wins this week</span>
            <textarea name="wins" rows={3} maxLength={1000} placeholder="New weight, more reps, made every session…" className="members-input" />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="font-semibold">What was hard</span>
            <textarea name="struggles" rows={3} maxLength={1000} placeholder="Anything sore, missed or hard to fit in" className="members-input" />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="font-semibold">
              Form video link <span className="font-normal">(optional)</span>
            </span>
            <input name="video" type="url" inputMode="url" maxLength={500} placeholder="https://youtu.be/… or a Google Drive link" className="members-input" />
            <span className="text-sm">Paste a link to an unlisted YouTube, Vimeo or Drive video. No uploads.</span>
          </label>
          <button type="submit" className="members-btn members-btn-solid w-full">
            Send to Alex
          </button>
        </form>
      )}

      <section aria-labelledby="past-heading" className="flex flex-col gap-3">
        <h2 id="past-heading" className="members-eyebrow">
          Past check-ins
        </h2>
        {c.check_ins.filter((x) => x.id !== thisWeek?.id).length === 0 ? (
          <p className="border-y border-line py-4">None yet.</p>
        ) : (
          <ul className="border-t border-line">
            {c.check_ins
              .filter((x) => x.id !== thisWeek?.id)
              .map((x) => (
                <li key={x.id} className="flex flex-col gap-2.5 border-b border-line py-4">
                  <div className="flex flex-col">
                    <b>{x.programme_week ? `Week ${x.programme_week}` : "Check-in"}</b>
                    <span className="text-sm">{shortWhen(x.created_at)}</span>
                  </div>
                  <p className="text-sm tabular-nums">
                    Energy <b>{x.energy}</b> · Sleep <b>{x.sleep}</b> · Training <b>{x.training}</b>
                  </p>
                  {x.coach_reply ? (
                    <div className="flex flex-col gap-1 rounded-2xl border border-line p-3.5">
                      <p>{x.coach_reply}</p>
                      <span className="text-sm">Alex{x.replied_at ? ` · ${shortWhen(x.replied_at)}` : ""}</span>
                    </div>
                  ) : null}
                </li>
              ))}
          </ul>
        )}
      </section>
    </CoachingShell>
  );
}
