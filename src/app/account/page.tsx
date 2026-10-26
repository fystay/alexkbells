import type { Metadata } from "next";
import Link from "next/link";
import { bookClass, cancelClass, signOutMember } from "@/app/account/actions";
import { site } from "@/content/site";
import { addDays, formatLongDate, weekdayIndex, type DateKey } from "@/lib/availability/dates";
import { CLASS_WINDOW_DAYS } from "@/lib/availability/timetable";
import { fullClasses, fullKey } from "@/lib/class-capacity";
import { publishedClasses } from "@/lib/class-sessions";
import { formatClock, londonToday, londonToUtc, toLondon } from "@/lib/coach/time";
import { formatPenceShort } from "@/lib/membership";
import { memberOverview, type MemberOverview } from "@/lib/member-auth";
import { requireMember } from "@/lib/member-session";
import { pageMetadata } from "@/lib/metadata";
import { formatTime } from "@/lib/schedule";
import { buttonClasses } from "@/components/ui/ButtonLink";
import { Section } from "@/components/ui/Section";
import { TitleBar } from "@/components/ui/TitleBar";

export const metadata: Metadata = pageMetadata({
  title: "Your membership",
  description: "Your RAENG membership, credits and classes.",
  path: "/account",
  noindex: true,
});

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/** After an action: what happened (?done=) or why it couldn't (?error=). */
const DONE: Record<string, string> = {
  booked: "Booked. One credit used.",
  cancelled: "Cancelled. Your credit is back.",
  cancelled_late: "Cancelled. It was less than 24 hours before the class, so the credit is used.",
};
const ERRORS: Record<string, string> = {
  class_full: "Sorry, that class is full.",
  class_cancelled: "That class has been cancelled.",
  no_credits: "You've no credits left this period.",
  already_booked: "You're already booked on that class.",
  class_started: "That class has already started.",
  outside_period: "Credits can only be used in the period they belong to. That date is in your next period.",
  not_found: "That class couldn't be found. Please try again.",
  failed: "Sorry, something went wrong. Please try again, or message Alex.",
};

/** "Saturday 31 October, 9:00 am" from a timestamp. */
function when(iso: string): string {
  const { date, time } = toLondon(iso);
  return `${formatLongDate(date)}, ${formatClock(time)}`;
}

function shortDate(key: string): string {
  return formatLongDate(key as DateKey).split(" ").slice(1).join(" ");
}

/** Classes the member could book with a credit: from today to the end of the current period. */
function bookable(overview: MemberOverview, today: DateKey, full: Awaited<ReturnType<typeof fullClasses>>) {
  if (!overview.period) return [];
  const last = overview.period.end < addDays(today, CLASS_WINDOW_DAYS) ? (overview.period.end as DateKey) : addDays(today, CLASS_WINDOW_DAYS);
  const taken = new Set(overview.places.filter((p) => p.status === "booked" || p.status === "attended").map((p) => `${p.slot}|${p.class_date}`));
  const now = Date.now();
  const fullKeys: readonly string[] = full.keys;
  const cancelledKeys: readonly string[] = full.cancelled;
  const out: { slot: string; date: DateKey; label: string; full: boolean }[] = [];
  for (let date = today; date <= last; date = addDays(date, 1)) {
    for (const c of publishedClasses()) {
      if (WEEKDAYS[weekdayIndex(date)] !== c.day) continue;
      if (new Date(londonToUtc(date, c.start)).getTime() <= now) continue;
      const key = fullKey(c.id, date);
      if (taken.has(`${c.id}|${date}`) || cancelledKeys.includes(key)) continue;
      out.push({ slot: c.id, date, label: `${formatLongDate(date)}, ${formatTime(c.start)}`, full: fullKeys.includes(key) });
    }
  }
  return out;
}

/** The member's booked places still to come. */
function upcomingPlaces(overview: MemberOverview) {
  const now = Date.now();
  return overview.places.filter((p) => p.status === "booked" && new Date(p.starts_at).getTime() > now);
}

/**
 * The member's account (owner, 2026-10-26): plan and renewal, this period's
 * credits, their classes (cancel, with the 24-hour rule said before it
 * applies) and the classes they can book with a credit. Paying, changing
 * details, pausing or cancelling the membership stay with Alex.
 */
export default async function AccountPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const member = await requireMember();
  const params = await searchParams;
  const today = londonToday();
  const [result, full] = await Promise.all([memberOverview(member.db, member.clientId), fullClasses(today)]);
  const done = typeof params.done === "string" ? DONE[params.done] : undefined;
  const error = typeof params.error === "string" ? (ERRORS[params.error] ?? ERRORS.failed) : undefined;

  if (!result.ok) {
    return (
      <Section labelledBy="account-heading">
        <h1 id="account-heading" className="font-display text-h1">
          Your membership.
        </h1>
        <TitleBar />
        <p className="mt-5 text-lede">Sorry, your account couldn&apos;t be loaded just now. Please try again in a minute.</p>
      </Section>
    );
  }

  const o = result.data;
  const m = o.membership;
  const upcoming = upcomingPlaces(o);
  const options = bookable(o, today, full);
  const left = o.period?.left ?? 0;

  return (
    <Section labelledBy="account-heading">
      <div className="lg:grid lg:grid-cols-12 lg:gap-x-14">
        <div className="lg:col-span-5">
          <p className="eyebrow">Members</p>
          <h1 id="account-heading" className="mt-3 font-display text-h1 text-balance">
            Your membership.
          </h1>
          <TitleBar />
          {done || error ? (
            <p role={error ? "alert" : "status"} className={`mt-6 rounded-2xl px-5 py-4 font-semibold ${error ? "border-2 border-ink bg-white" : "bg-ink text-white"}`}>
              {error ?? done}
            </p>
          ) : null}

          {m ? (
            <div className="mt-8 grid grid-cols-1 gap-3">
              <div className="card px-5 py-5 sm:px-6">
                <p className="text-sm">Plan</p>
                <p className="card-title text-xl">
                  {m.plan_name} · {formatPenceShort(m.price_pence)} / 4 weeks
                </p>
                <p className="mt-1.5">
                  {m.status === "active" && m.renews_on
                    ? `Renews ${formatLongDate(m.renews_on as DateKey)}, with ${m.credits} new credits.`
                    : m.status === "paused"
                      ? "Paused. Message Alex to start it again."
                      : `Cancelled${m.cancelled_on ? ` from ${formatLongDate(m.cancelled_on as DateKey)}` : ""}. Credits you have can still be used until the end of this period.`}
                </p>
              </div>
              {o.period ? (
                <div className="card px-5 py-5 sm:px-6">
                  <p className="text-sm">Credits this period</p>
                  <p className="mt-1">
                    <span className="font-display text-h2 tabular-nums">{left}</span>{" "}
                    <span className="font-semibold">left of {o.period.credits}</span>
                  </p>
                  <p className="mt-1.5 text-sm">
                    {shortDate(o.period.start)} to {shortDate(o.period.end)}. Unused credits don&apos;t roll over.
                  </p>
                </div>
              ) : null}
            </div>
          ) : (
            <p className="mt-8 text-lede">You don&apos;t have a current membership.</p>
          )}
        </div>

        <div className="mt-12 lg:col-span-7 lg:mt-0">
          <h2 className="card-title text-xl">Your classes</h2>
          {upcoming.length === 0 ? (
            <p className="card mt-3 px-5 py-5 sm:px-6">No classes booked yet.</p>
          ) : (
            <ul className="mt-3 grid grid-cols-1 gap-3">
              {upcoming.map((p) => (
                <li key={p.id} className="card px-5 py-5 sm:px-6">
                  <p className="card-title">{when(p.starts_at)}</p>
                  {p.can_cancel ? (
                    p.credit_back_if_cancelled ? (
                      <form action={cancelClass} className="mt-3">
                        <input type="hidden" name="place" value={p.id} />
                        <button type="submit" className="inline-flex min-h-11 items-center font-semibold underline underline-offset-4 hover:no-underline">
                          Cancel<span className="sr-only"> {when(p.starts_at)}</span>
                        </button>
                        <span className="ml-2 text-sm">Your credit comes back.</span>
                      </form>
                    ) : (
                      // Less than 24 hours to go: say what happens before it does.
                      <details className="mt-3">
                        <summary className="inline-flex min-h-11 cursor-pointer items-center font-semibold underline underline-offset-4">Cancel</summary>
                        <form action={cancelClass} className="mt-2">
                          <input type="hidden" name="place" value={p.id} />
                          <p>It&apos;s less than 24 hours before the class, so the credit will be used.</p>
                          <button type="submit" className={buttonClasses("secondary", "mt-3")}>
                            Cancel anyway<span className="sr-only"> {when(p.starts_at)}</span>
                          </button>
                        </form>
                      </details>
                    )
                  ) : (
                    <p className="mt-1.5 text-sm">To change this place, message Alex.</p>
                  )}
                </li>
              ))}
            </ul>
          )}

          <h2 className="card-title mt-10 text-xl">Book with a credit</h2>
          {!o.period ? (
            <p className="card mt-3 px-5 py-5 sm:px-6">Your next period hasn&apos;t started yet. You can book once it has.</p>
          ) : left === 0 ? (
            <p className="card mt-3 px-5 py-5 sm:px-6">You&apos;ve used every credit this period. New credits come when your membership renews.</p>
          ) : options.length === 0 ? (
            <p className="card mt-3 px-5 py-5 sm:px-6">No more classes to book this period.</p>
          ) : (
            <ul className="mt-3 grid grid-cols-1 gap-3">
              {options.map((c) => (
                <li key={`${c.slot}|${c.date}`} className="card flex min-h-16 items-center justify-between gap-4 px-5 py-3 sm:px-6">
                  <span className="font-semibold">{c.label}</span>
                  {c.full ? (
                    <span className="text-sm">Full</span>
                  ) : (
                    <form action={bookClass}>
                      <input type="hidden" name="slot" value={c.slot} />
                      <input type="hidden" name="date" value={c.date} />
                      <button type="submit" className={buttonClasses("primary", "min-h-11 px-5")}>
                        Book<span className="sr-only"> {c.label}</span>
                      </button>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          )}

          <p className="mt-10 text-sm">
            To change your details, or pause or cancel your membership, message Alex on{" "}
            <a href={site.social.instagram.url} target="_blank" rel="noopener noreferrer" className="font-semibold underline underline-offset-4 hover:no-underline">
              Instagram<span className="sr-only"> (opens in a new tab)</span>
            </a>
            . <Link href="/memberships#cancellation" className="font-semibold underline underline-offset-4 hover:no-underline">Cancellation policy</Link>
          </p>
          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2">
            <form action={signOutMember}>
              <button type="submit" className={buttonClasses("secondary")}>
                Sign out
              </button>
            </form>
            <form action={signOutMember}>
              <input type="hidden" name="everywhere" value="yes" />
              <button type="submit" className="inline-flex min-h-12 items-center font-semibold underline underline-offset-4 hover:no-underline">
                Sign out of every device
              </button>
            </form>
          </div>
        </div>
      </div>
    </Section>
  );
}
