import Link from "next/link";
import { membershipPlans } from "@/content/memberships";
import { getService } from "@/content/services";
import { addDays, formatLongDate, type DateKey } from "@/lib/availability/dates";
import { formatDayMonth } from "@/lib/coach/time";
import { bestPlanFor, formatPenceShort, maxSavingPence } from "@/lib/membership";
import type { MemberOverview } from "@/lib/member-auth";

/** This period's payment, when a member pays online and it's still to pay (credits wait for it). */
export function PaymentDue({ due }: { due: { amountPence: number; url: string | null; direct?: boolean } }) {
  if (due.direct) {
    return (
      <section aria-labelledby="due-heading" className="rounded-3xl bg-white p-5.5">
        <p className="members-eyebrow">Direct Debit</p>
        <h2 id="due-heading" className="mt-1 text-2xl font-extrabold tracking-[-0.02em]">
          {formatPenceShort(due.amountPence)} is being collected
        </h2>
        <p className="mt-1 text-ink">Your bank takes about three working days. This period&apos;s credits work as soon as it clears.</p>
      </section>
    );
  }
  return (
    <section aria-labelledby="due-heading" className="rounded-3xl border-2 border-ink bg-white p-5.5">
      <p className="members-eyebrow">Payment due</p>
      <h2 id="due-heading" className="mt-1 text-2xl font-extrabold tracking-[-0.02em]">
        {formatPenceShort(due.amountPence)} for this period
      </h2>
      <p className="mt-1 text-ink">This period&apos;s credits work as soon as it&apos;s paid.</p>
      {due.url ? (
        <a href={due.url} className="members-btn members-btn-solid mt-4 w-full sm:w-auto">
          Pay with Stripe
        </a>
      ) : (
        <p className="mt-3 text-sm">The payment link is in your email. If you can&apos;t find it, message Alex.</p>
      )}
    </section>
  );
}

/**
 * Pay as you go: the class price, and what a membership would have saved them
 * (from content prices and their own paid bookings over 4 weeks).
 */
export function PayAsYouGo({ o, today }: { o: MemberOverview; today: DateKey }) {
  const payg = getService("group-classes").prices[0];
  const best = payg ? bestPlanFor(membershipPlans, o.paid_classes_28d, payg.amountGbp) : null;
  return (
    <section aria-labelledby="payg-heading" className="rounded-3xl border-[1.5px] border-ink p-5.5">
      <p className="members-eyebrow">Your plan</p>
      <h2 id="payg-heading" className="mt-1 text-[1.75rem] font-extrabold tracking-[-0.03em]">
        Pay as you go
      </h2>
      {payg ? <p className="text-ink">£{payg.amountGbp} a class, paid when you book.</p> : null}
      <p className="mt-3">
        {best
          ? `You've booked ${o.paid_classes_28d} classes between ${formatDayMonth(addDays(today, -14))} and ${formatDayMonth(addDays(today, 13))}. On the ${best.plan.name} plan that would have been ${formatPenceShort(best.plan.priceGbp * 100)}${o.paid_classes_28d > best.plan.credits ? " plus the extra classes" : ""}, saving ${formatPenceShort(best.savingPence)}.`
          : payg
            ? `Members save up to ${formatPenceShort(maxSavingPence(membershipPlans, payg.amountGbp))} every 4 weeks.`
            : "Save with a membership."}
      </p>
      <Link href="/memberships" className="members-link mt-1">
        See memberships
      </Link>
    </section>
  );
}

/** Class credits from cancelled paid bookings: how many, and when the first runs out. */
export function ClassCredits({ o }: { o: MemberOverview }) {
  const n = o.class_credits.length;
  if (n === 0) return null;
  return (
    <section aria-labelledby="class-credits-heading" className="flex flex-col gap-1 border-y border-line py-4">
      <h2 id="class-credits-heading" className="text-lg font-bold">
        Class credits: {n} {n === 1 ? "class" : "classes"}, nothing to pay
      </h2>
      <p className="text-sm text-ink">
        {n === 1 ? "Use it" : "The first runs out"} by {formatLongDate(o.class_credits[0].expires_on as DateKey)}.
      </p>
    </section>
  );
}

/** When the account can't be read (the database didn't answer). */
export function AccountUnavailable() {
  return (
    <div className="mx-auto max-w-[620px] px-5 py-16">
      <h1 className="text-[clamp(1.875rem,8.4vw,2.625rem)] leading-[1.05] font-extrabold tracking-[-0.035em]">Your account.</h1>
      <p className="mt-5 text-lg">Sorry, your account couldn&apos;t be loaded just now. Please try again in a minute.</p>
    </div>
  );
}
