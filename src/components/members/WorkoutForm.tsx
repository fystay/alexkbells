"use client";

import { useRef, useState } from "react";
import { finishSession } from "@/app/account/coaching/actions";
import { programmedNumber, setField } from "@/lib/coaching-form";
import { qty } from "@/lib/coaching";

export interface WorkoutExercise {
  id: string;
  name: string;
  sets: number;
  reps: string;
  load: string;
  note: string;
  videoUrl: string | null;
  /** What they logged for it on this day last week, e.g. "20 kg × 10". */
  last: string | null;
  /** Set values when logging a day again: [load, reps, done] per set. */
  logged?: [string, string, boolean][];
}

/**
 * Today's workout (owner's design): each exercise with its sets, a weight and
 * reps box per set (starting at what was programmed) and a tick. A plain form,
 * so it works without JavaScript; the script only keeps the count of ticked
 * sets. Finish logs it, and the server reads the exercises and set counts
 * from the programme, not from this form.
 */
export function WorkoutForm({ week, day, coach, exercises, note }: { week: number; day: string; coach: string; exercises: WorkoutExercise[]; note: string }) {
  const form = useRef<HTMLFormElement>(null);
  const total = exercises.reduce((n, e) => n + e.sets, 0);
  const initial = exercises.reduce((n, e) => n + (e.logged?.filter((l) => l[2]).length ?? 0), 0);
  const [ticked, setTicked] = useState(initial);
  const count = () => setTicked(form.current?.querySelectorAll<HTMLInputElement>('input[type="checkbox"]:checked').length ?? 0);

  return (
    <form ref={form} action={finishSession} onChange={count} className="flex flex-col gap-7">
      <input type="hidden" name="day" value={day} />
      <ol className="flex flex-col gap-6">
        {exercises.map((e, i) => {
          const [, repUnit] = qty(e.reps);
          const [, loadUnit] = qty(e.load);
          return (
            <li key={e.id} className="flex flex-col gap-3 border-t border-line pt-5">
              <div className="grid grid-cols-[32px_1fr] gap-3">
                <span aria-hidden="true" className="grid size-8 place-items-center rounded-full border-[1.5px] border-line text-sm font-bold">
                  {i + 1}
                </span>
                <div className="flex min-w-0 flex-col gap-0.5">
                  <b className="text-lg">{e.name}</b>
                  <span className="text-sm">
                    {e.sets} × {e.reps || "reps"}
                    {e.load ? ` · ${e.load}` : ""}
                  </span>
                  {e.note ? <span className="text-sm">{e.note}</span> : null}
                  <span className="mt-1 flex flex-wrap items-center gap-x-4 text-sm">
                    {e.videoUrl ? (
                      <a href={e.videoUrl} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center font-semibold underline underline-offset-4">
                        Watch demo<span className="sr-only"> of {e.name} (opens in a new tab)</span> ↗
                      </a>
                    ) : null}
                    {e.last ? <span>Last week: {e.last}</span> : null}
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                {Array.from({ length: e.sets }, (_, s) => {
                  const saved = e.logged?.[s];
                  return (
                    <div key={s} className="grid grid-cols-[28px_1fr_1fr_44px] items-center gap-2.5">
                      <span aria-hidden="true" className="text-center text-sm font-semibold tabular-nums">
                        {s + 1}
                      </span>
                      <label className="relative block">
                        <span className="sr-only">
                          {e.name} set {s + 1} weight
                        </span>
                        <input
                          name={setField("load", e.id, s + 1)}
                          inputMode="decimal"
                          maxLength={20}
                          defaultValue={saved ? saved[0] : programmedNumber(e.load)}
                          className="members-input pr-11 font-semibold tabular-nums"
                        />
                        <em aria-hidden="true" className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs not-italic">
                          {loadUnit}
                        </em>
                      </label>
                      <label className="relative block">
                        <span className="sr-only">
                          {e.name} set {s + 1} reps
                        </span>
                        <input
                          name={setField("reps", e.id, s + 1)}
                          inputMode="decimal"
                          maxLength={20}
                          defaultValue={saved ? saved[1] : programmedNumber(e.reps)}
                          className="members-input pr-14 font-semibold tabular-nums"
                        />
                        <em aria-hidden="true" className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs not-italic">
                          {repUnit}
                        </em>
                      </label>
                      <label className="coaching-done">
                        <input type="checkbox" name={setField("done", e.id, s + 1)} defaultChecked={saved ? saved[2] : false} />
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path d="m5 12.5 4.5 4.5L19 7.5" />
                        </svg>
                        <span className="sr-only">
                          {e.name} set {s + 1} done
                        </span>
                      </label>
                    </div>
                  );
                })}
              </div>
            </li>
          );
        })}
      </ol>

      <section aria-labelledby="finish-heading" className="flex flex-col gap-3 border-t border-line pt-5">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="finish-heading" className="members-eyebrow">
            Finish
          </h2>
          <span role="status" className="text-sm tabular-nums">
            {ticked} of {total} sets
          </span>
        </div>
        <label className="flex flex-col gap-1.5">
          <span className="font-semibold">Note for {coach} (optional)</span>
          <textarea name="note" rows={3} maxLength={500} defaultValue={note} placeholder="How did it feel? Anything sore or easy?" className="members-input" />
        </label>
        <p className="text-sm">
          Week {week} · {day}. Unticked sets are saved as missed. This goes straight to {coach}.
        </p>
        <button type="submit" className="members-btn members-btn-solid w-full">
          Finish session
        </button>
      </section>
    </form>
  );
}
