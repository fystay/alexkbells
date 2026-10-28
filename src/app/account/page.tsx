import type { Metadata } from "next";
import Link from "next/link";
import { bookClass, bookClassWithCredit, cancelClass, signOutMember } from "@/app/account/actions";
import { membershipPlans } from "@/content/memberships";
import { getService } from "@/content/services";
import { groupClass } from "@/content/classes";
import { mapsUrl, site } from "@/content/site";
import { addDays, formatLongDate, weekdayIndex, type DateKey } from "@/lib/availability/dates";
import { CLASS_WINDOW_DAYS } from "@/lib/availability/timetable";
import { fullClasses, fullKey } from "@/lib/class-capacity";
import { publishedClasses } from "@/lib/class-sessions";
import { formatClock, londonToday, londonToUtc, toLondon } from "@/lib/coach/time";
import { bestPlanFor, formatPenceShort, maxSavingPence } from "@/lib/membership";
import { memberOverview, type MemberOverview, type MemberPlace } from "@/lib/member-auth";
import { requireMember } from "@/lib/member-session";
import { paymentDue } from "@/lib/membership-checkout";
import { squareConfig } from "@/lib/square/config";
import { pageMetadata } from "@/lib/metadata";
import { getPrimaryCtaFor } from "@/lib/booking";
import { formatTime } from "@/lib/schedule";
import { googleCalendarUrl } from "@/lib/calendar";
import { classEventFor } from "@/app/account/class-event";
import { ClearStatus } from "@/components/account/ClearStatus";
import { buttonClasses } from "@/components/ui/ButtonLink";
import { Section } from "@/components/ui/Section";

export const metadata: Metadata = pageMetadata({
  title: "Your account",
  description: "Your RAENG classes, credits and membership.",
  path: "/account",
  noindex: true,
});

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

/** After an action: what happened (?done=) or why it couldn't (?error=). */
const DONE: Record<string, string> = {
  booked: "Booked. One credit used.",
  cancelled: "Cancelled. Your credit is back.",
  cancelled_late: "Cancelled. It was less than 24 hours before the class, so the credit is used.",
  cancelled_credit: "Cancelled. You have a class credit for another class within 4 weeks.",
  cancelled_paid_late: "Cancelled. It was less than 24 hours before the class, so there's nothing back.",
  booked_class_credit: "Booked with your class credit. Nothing to pay.",
};
const ERRORS: Record<string, string> = {
  class_full: "Sorry, that class is full.",
  class_cancelled: "That class has been cancelled.",
  no_credits: "You've no credits left this period.",
  already_booked: "You're already booked on that class.",
  class_started: "That class has already started.",
  outside_period: "Credits can only be used in the period they belong to. That date is in your next period.",
  period_unpaid: "Please pay for this period first. Its credits work as soon as Square confirms.",
  not_found: "That class couldn't be found. Please try again.",
  credit_invalid: "That class credit can't be used for that class. It may have been used, or the class is after it runs out.",
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

/** Classes that could be booked from today until `until` (a period's end or a class credit's expiry). */
function bookable(overview: MemberOverview, today: DateKey, until: string | null, full: Awaited<ReturnType<typeof fullClasses>>) {
  if (!until) return [];
  const last = until < addDays(today, CLASS_WINDOW_DAYS) ? (until as DateKey) : addDays(today, CLASS_WINDOW_DAYS);
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

/** "This week", "Next week", then "Week of 9 November" (weeks start on Monday). */
function weekLabel(date: DateKey, today: DateKey): string {
  const monday = (d: DateKey) => addDays(d, -weekdayIndex(d));
  const thisWeek = monday(today);
  const week = monday(date);
  if (week === thisWeek) return "This week";
  if (week === addDays(thisWeek, 7)) return "Next week";
  return `Week of ${shortDate(week)}`;
}

/** Booked places still to come. */
function upcomingPlaces(overview: MemberOverview) {
  const now = Date.now();
  return overview.places.filter((p) => p.status === "booked" && new Date(p.starts_at).getTime() > now);
}

/** Classes in the last 4 weeks that have happened (or were missed). */
function pastPlaces(overview: MemberOverview) {
  const now = Date.now();
  return overview.places.filter((p) => (p.status === "attended" || p.status === "no_show" || p.status === "booked") && new Date(p.starts_at).getTime() <= now).reverse();
}

/** What cancelling gives back, said before it happens. */
function cancelNote(p: MemberPlace): { inTime: string; late: string } {
  return p.how === "credit"
    ? { inTime: "Your credit comes back.", late: "It's less than 24 hours before the class, so the credit will be used." }
    : { inTime: "You get a class credit for another class within 4 weeks.", late: "It's less than 24 hours before the class, so there's nothing back." };
}

const linkClass = "font-semibold underline underline-offset-4 hover:no-underline";

/**
 * The customer's account (owner, 2026-10-26 for members; 2026-10-28 for
 * everyone who has paid, the standard gym flow): their classes (cancel, with
 * the 24-hour rule said before it applies), class credits from cancelled paid
 * bookings (book with one), and for members the plan, renewal, this period's
 * credits and payment due. Pay-as-you-go customers also see Book a class and
 * what a membership would have saved them. Changing details, pausing or
 * cancelling a membership stay with Alex.
 */
export default async function AccountPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const member = await requireMember();
  const params = await searchParams;
  const today = londonToday();
  const [result, full, due] = await Promise.all([
    memberOverview(member.db, member.clientId),
    fullClasses(today),
    // Members who pay online: this period's payment, if it's still to pay (credits wait for it).
    paymentDue(member.db, squareConfig(), member.clientId),
  ]);
  const done = typeof params.done === "string" ? DONE[params.done] : undefined;
  // The class just booked (?at=date.slot), marked in the list.
  const justBooked = done && typeof params.at === "string" ? params.at : null;
  const error = typeof params.error === "string" ? (ERRORS[params.error] ?? ERRORS.failed) : undefined;

  if (!result.ok) {
    return (
      <Section labelledBy="account-heading">
        <h1 id="account-heading" className="font-display text-h1">
          Your account.
        </h1>
        <p className="mt-5 text-lede">Sorry, your account couldn&apos;t be loaded just now. Please try again in a minute.</p>
      </Section>
    );
  }

  const o = result.data;
  const m = o.membership;
  const upcoming = upcomingPlaces(o);
  const past = pastPlaces(o);
  const options = bookable(o, today, o.period?.end ?? null, full);
  const left = o.period?.left ?? 0;
  // The class credit that runs out first is the one to use.
  const classCredit = o.class_credits[0] ?? null;
  const creditOptions = classCredit ? bookable(o, today, classCredit.expires_on, full) : [];
  const payg = getService("group-classes").prices[0];
  const best = !m && payg ? bestPlanFor(membershipPlans, o.paid_classes_28d, payg.amountGbp) : null;
  const booking = getPrimaryCtaFor("group-class");
  const next = upcoming[0] ?? null;

  return (
    <Section labelledBy="account-heading">
      <div className="lg:grid lg:grid-cols-12 lg:gap-x-14">
        <div className="lg:col-span-5">
          <p className="eyebrow">{m ? "Members" : "Your account"}</p>
          <h1 id="account-heading" className="mt-3 font-display text-h1 text-balance">
            {m ? "Your membership." : "Your account."}
          </h1>
          {o.client.email ? <p className="mt-3 text-sm">Signed in as {o.client.email}</p> : null}
          {done || error ? <ClearStatus /> : null}
          {done || error ? (
            <p role={error ? "alert" : "status"} className={`mt-6 rounded-2xl px-5 py-4 font-semibold ${error ? "border-2 border-ink bg-white" : "bg-ink text-white"}`}>
              {error ?? done}
            </p>
          ) : null}

          <div className="mt-8 grid grid-cols-1 gap-3">
            {next ? <NextClass place={next} /> : null}
            {m ? (
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
            ) : null}
            {due ? (
              <div className="card px-5 py-5 sm:px-6">
                <p className="text-sm">Payment due</p>
                <p className="card-title text-xl">{formatPenceShort(due.amountPence)} for this period</p>
                <p className="mt-1.5">This period&apos;s credits work as soon as it&apos;s paid.</p>
                {due.url ? (
                  <a href={due.url} className={buttonClasses("action", "mt-4 w-full px-6 sm:w-auto")}>
                    Pay with Square
                  </a>
                ) : (
                  <p className="mt-3 text-sm">The payment link is in your email. If you can&apos;t find it, message Alex.</p>
                )}
              </div>
            ) : null}
            {o.period ? (
              <div className="card px-5 py-5 sm:px-6">
                <p className="text-sm">Credits this period</p>
                <p className="mt-1">
                  <span className="font-display text-h2 tabular-nums">{left}</span>{" "}
                  <span className="font-semibold">left of {o.period.credits}</span>
                </p>
                {/* The same at a glance: one dot per credit, filled while unused. */}
                <div aria-hidden="true" className="mt-2 flex flex-wrap gap-1.5">
                  {Array.from({ length: o.period.credits }, (_, i) => (
                    <span key={i} className={`size-3 rounded-full border border-ink ${i < left ? "bg-ink" : ""}`} />
                  ))}
                </div>
                <p className="mt-1.5 text-sm">
                  {shortDate(o.period.start)} to {shortDate(o.period.end)}. Unused credits don&apos;t roll over.
                </p>
              </div>
            ) : null}
            {o.class_credits.length > 0 ? (
              <div className="card px-5 py-5 sm:px-6">
                <p className="text-sm">Class credits</p>
                <p className="mt-1">
                  <span className="font-display text-h2 tabular-nums">{o.class_credits.length}</span>{" "}
                  <span className="font-semibold">{o.class_credits.length === 1 ? "class" : "classes"}, nothing to pay</span>
                </p>
                <p className="mt-1.5 text-sm">
                  {o.class_credits.length === 1 ? "Use it" : "The first runs out"} by {formatLongDate(o.class_credits[0].expires_on as DateKey)}.
                </p>
              </div>
            ) : null}
            {!m ? (
              // Pay as you go: the class price, and what a membership would have saved them (from content and their own bookings).
              <div className="card px-5 py-5 sm:px-6">
                <p className="text-sm">Pay as you go</p>
                {payg ? <p className="card-title text-xl">£{payg.amountGbp} a class</p> : null}
                <p className="mt-1.5">
                  {best
                    ? `You've booked ${o.paid_classes_28d} classes between ${shortDate(addDays(today, -14))} and ${shortDate(addDays(today, 13))}. On the ${best.plan.name} plan that would have been ${formatPenceShort(best.plan.priceGbp * 100)}${o.paid_classes_28d > best.plan.credits ? " plus the extra classes" : ""}, saving ${formatPenceShort(best.savingPence)}.`
                    : payg
                      ? `Members save up to ${formatPenceShort(maxSavingPence(membershipPlans, payg.amountGbp))} every 4 weeks.`
                      : "Save with a membership."}
                </p>
                <Link href="/memberships" className={`mt-2 inline-flex min-h-11 items-center ${linkClass}`}>
                  See memberships
                </Link>
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-12 lg:col-span-7 lg:mt-0">
          <h2 className="card-title text-xl">Your classes</h2>
          {upcoming.length === 0 ? (
            <p className="card mt-3 px-5 py-5 sm:px-6">No classes booked yet.</p>
          ) : (
            <ul className="mt-3 grid grid-cols-1 gap-3">
              {upcoming.map((p) => {
                const note = cancelNote(p);
                const paidPlace = p.how === "paid" || p.how === "class_credit";
                return (
                  <li
                    key={p.id}
                    className={`card px-5 py-5 sm:px-6 ${justBooked === `${p.class_date}.${p.slot}` ? "ring-2 ring-ink ring-offset-2 ring-offset-paper" : ""}`}
                  >
                    {justBooked === `${p.class_date}.${p.slot}` ? <p className="eyebrow mb-2">Just booked</p> : null}
                    <p className="card-title">{when(p.starts_at)}</p>
                    <p className="mt-0.5 text-sm">
                      {p.how === "credit" ? "Membership credit" : p.how === "paid" ? "Paid" : p.how === "class_credit" ? "Class credit" : "Arranged with Alex"}
                    </p>
                    <a href={`/account/calendar?place=${p.id}`} className={`mt-1 inline-flex min-h-11 items-center text-sm ${linkClass}`}>
                      Add to calendar<span className="sr-only"> {when(p.starts_at)}</span>
                    </a>
                    {p.can_cancel ? (
                      // Cancelling asks first, and says what comes back (or that nothing does, under 24 hours).
                      <details className="mt-1">
                        <summary className="inline-flex min-h-11 cursor-pointer items-center font-semibold underline underline-offset-4 hover:no-underline">
                          Cancel<span className="sr-only"> {when(p.starts_at)}</span>
                        </summary>
                        <form action={cancelClass} className="mt-2">
                          <input type="hidden" name="place" value={p.id} />
                          {paidPlace ? <input type="hidden" name="paid" value="yes" /> : null}
                          <p>{p.credit_back_if_cancelled ? note.inTime : note.late}</p>
                          <button type="submit" className={buttonClasses("secondary", "mt-3")}>
                            {p.credit_back_if_cancelled ? "Cancel class" : "Cancel anyway"}
                            <span className="sr-only"> {when(p.starts_at)}</span>
                          </button>
                        </form>
                      </details>
                    ) : (
                      <p className="mt-1.5 text-sm">To change this place, message Alex.</p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {m ? (
            <>
              <h2 className="card-title mt-10 text-xl">Book with a credit</h2>
              {!o.period ? (
                <p className="card mt-3 px-5 py-5 sm:px-6">Your next period hasn&apos;t started yet. You can book once it has.</p>
              ) : due ? (
                <p className="card mt-3 px-5 py-5 sm:px-6">Pay for this period to book with its credits.</p>
              ) : left === 0 ? (
                <p className="card mt-3 px-5 py-5 sm:px-6">You&apos;ve used every credit this period. New credits come when your membership renews.</p>
              ) : options.length === 0 ? (
                <p className="card mt-3 px-5 py-5 sm:px-6">No more classes to book this period.</p>
              ) : (
                <ClassOptions options={options} today={today} action={bookClass} />
              )}
            </>
          ) : null}

          {classCredit ? (
            <>
              <h2 className="card-title mt-10 text-xl">Book with your class credit</h2>
              {creditOptions.length === 0 ? (
                <p className="card mt-3 px-5 py-5 sm:px-6">No classes to book before your credit runs out.</p>
              ) : (
                <ClassOptions options={creditOptions} today={today} action={bookClassWithCredit} credit={classCredit.id} />
              )}
            </>
          ) : null}

          {!m ? (
            <div className="mt-10">
              <h2 className="card-title text-xl">Book a class</h2>
              <p className="mt-2">Pick a class and pay when you book. Your details are filled in for you.</p>
              <Link href={booking.href} className={buttonClasses("action", "mt-4 w-full px-6 sm:w-auto")}>
                Book now
              </Link>
            </div>
          ) : null}

          {past.length > 0 ? (
            <>
              <h2 className="card-title mt-10 text-xl">The last 4 weeks</h2>
              <ul className="mt-3 border-t border-line">
                {past.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-baseline justify-between gap-x-4 border-b border-line py-3">
                    <span>{when(p.starts_at)}</span>
                    <span className="text-sm">{p.status === "no_show" ? "Missed" : "Done"}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : null}

          <p className="mt-10 text-sm">
            {m ? "To change your details, or pause or cancel your membership" : "To change your details"}, message Alex on{" "}
            <a href={site.social.instagram.url} target="_blank" rel="noopener noreferrer" className={linkClass}>
              Instagram<span className="sr-only"> (opens in a new tab)</span>
            </a>
            .{" "}
            <Link href={m ? "/memberships#cancellation" : "/classes"} className={linkClass}>
              {m ? "Cancellation policy" : "About the classes"}
            </Link>
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

/** The next class first: when, where, and into the calendar or the map. */
function NextClass({ place }: { place: MemberPlace }) {
  const l = site.location;
  return (
    <div className="card px-5 py-5 sm:px-6">
      <p className="text-sm">Your next class</p>
      <p className="card-title text-xl">{when(place.starts_at)}</p>
      <p className="mt-1.5">
        {groupClass.name} at {l.venue}, {l.town}
      </p>
      <div className="mt-2 flex flex-wrap gap-x-5">
        <a href={`/account/calendar?place=${place.id}`} className={`inline-flex min-h-11 items-center ${linkClass}`}>
          Add to calendar
        </a>
        <a href={googleCalendarUrl(classEventFor(place))} target="_blank" rel="noopener noreferrer" className={`inline-flex min-h-11 items-center ${linkClass}`}>
          Google Calendar<span className="sr-only"> (opens in a new tab)</span>
        </a>
        <a href={mapsUrl()} target="_blank" rel="noopener noreferrer" className={`inline-flex min-h-11 items-center ${linkClass}`}>
          Directions<span className="sr-only"> (opens in a new tab)</span>
        </a>
      </div>
    </div>
  );
}

/** Classes to book with one press (a membership credit, or with `credit` a class credit), as rows grouped by week. */
function ClassOptions({
  options,
  today,
  action,
  credit,
}: {
  options: ReturnType<typeof bookable>;
  today: DateKey;
  action: (formData: FormData) => Promise<void>;
  credit?: string;
}) {
  const weeks: { label: string; items: typeof options }[] = [];
  for (const c of options) {
    const label = weekLabel(c.date, today);
    if (weeks.at(-1)?.label !== label) weeks.push({ label, items: [] });
    weeks.at(-1)!.items.push(c);
  }
  return (
    <div className="mt-3 space-y-6">
      {weeks.map((w) => (
        <div key={w.label}>
          <h3 className="eyebrow">{w.label}</h3>
          <ul className="mt-2 border-t border-line">
            {w.items.map((c) => (
              <li key={`${c.slot}|${c.date}`} className="flex min-h-16 items-center justify-between gap-4 border-b border-line py-2.5">
                <span className="font-semibold">{c.label}</span>
                {c.full ? (
                  <span className="text-sm">Full</span>
                ) : (
                  <form action={action}>
                    <input type="hidden" name="slot" value={c.slot} />
                    <input type="hidden" name="date" value={c.date} />
                    {credit ? <input type="hidden" name="credit" value={credit} /> : null}
                    <button type="submit" className={buttonClasses("secondary", "min-h-11 px-5")}>
                      Book<span className="sr-only"> {c.label}</span>
                    </button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
