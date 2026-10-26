import Link from "next/link";
import { BILLING_WEEKS, membershipPlans } from "@/content/memberships";
import { getService } from "@/content/services";
import { getPrimaryCtaFor } from "@/lib/booking";
import { extraCostPence, formatPenceShort, planFigures } from "@/lib/membership";
import { ChoiceCards, type Choice } from "@/components/ui/ChoiceCards";
import { ChoiceCover, choiceBadge, choiceCard } from "@/components/ui/choice";
import { cn } from "@/lib/cn";
import { timetable } from "@/content/classes";
import { isPublishable } from "@/lib/publish";
import { sortSessions } from "@/lib/schedule";

const payg = getService("group-classes").prices[0];

/**
 * The plans as cards (warm tech, owner's pick C, 2026-10-26): one white
 * rounded card per plan, name and price on the first line, classes and the
 * cost per class on the second with the saving as an ink tag, Pay as you go
 * last. Choose a card (it turns ink), then the button (select, then continue,
 * as everywhere on the site): "Join <plan>" for a membership (owner,
 * 2026-10-26), "Book now" for pay as you go. Either way the calendar opens
 * next, with the plan carried over (`?plan=`); Alex sets the membership up
 * when he confirms the first class. Home and /memberships share it.
 */
export function PlanList({ className }: { className?: string }) {
  const book = getPrimaryCtaFor("group-class");
  const planHref = (id: string) => (book.kind === "booking" && !book.external ? `${book.href}?plan=${id}` : book.href);
  const choices: Choice[] = [
    ...membershipPlans.map((plan) => ({
      value: plan.id,
      label: `${plan.name} plan`,
      href: planHref(plan.id),
      action: `Join ${plan.name}`,
      next: "Next, pick your first class.",
      external: book.external,
    })),
    { value: "payg", label: "Pay as you go", href: book.href, action: "Book now", external: book.external },
  ];
  const card = cn("card relative px-5 py-5 sm:px-6", choiceCard);
  return (
    <ChoiceCards name="plan" legend="Choose a membership plan" choices={choices} prompt="Tap a plan to choose it." className={className}>
      <ul aria-label="Membership plans" className="grid grid-cols-1 gap-3">
        {membershipPlans.map((plan) => {
          const f = planFigures(plan, payg.amountGbp);
          return (
            <li key={plan.id} className={card}>
              <ChoiceCover name="plan" value={plan.id} label={`${plan.name}, £${plan.priceGbp} every ${BILLING_WEEKS} weeks, ${plan.credits} classes, save ${formatPenceShort(f.savingPence)}`} />
              <div className="flex items-baseline justify-between gap-4">
                <h3 className="card-title flex items-center gap-3 text-xl">
                  <PlanDot />
                  {plan.name}
                </h3>
                <p className="shrink-0 text-sm">
                  <span className="text-xl font-bold tabular-nums">£{plan.priceGbp}</span> / {BILLING_WEEKS} weeks
                </p>
              </div>
              <div className="mt-3 flex items-center justify-between gap-4 pl-8">
                <p className="text-sm">
                  {plan.credits} classes · {formatPenceShort(f.perClassPence)} each
                </p>
                {f.savingPence > 0 ? (
                  <span className={cn("shrink-0 rounded-full bg-ink px-3 py-1 text-sm font-semibold text-white", choiceBadge)}>
                    Save {formatPenceShort(f.savingPence)}
                  </span>
                ) : null}
              </div>
            </li>
          );
        })}
        <li className={card}>
          <ChoiceCover name="plan" value="payg" label={`Pay as you go, £${payg.amountGbp} per class`} />
          <div className="flex items-baseline justify-between gap-4">
            <h3 className="card-title flex items-center gap-3 text-xl">
              <PlanDot />
              Pay as you go
            </h3>
            <p className="shrink-0 text-sm">
              <span className="text-xl font-bold tabular-nums">£{payg.amountGbp}</span> / class
            </p>
          </div>
          <p className="mt-3 pl-8 text-sm">No membership needed</p>
        </li>
      </ul>
    </ChoiceCards>
  );
}

/** The card's choice mark: an empty circle, filled once the card is chosen, so the cards read as tappable. */
function PlanDot() {
  return (
    <span aria-hidden="true" className="flex size-5 shrink-0 items-center justify-center rounded-full border-[1.5px] border-current"><span className="size-2.5 scale-0 rounded-full bg-current motion-safe:transition-transform group-has-[:checked]/choice:scale-100" /></span>
  );
}

/**
 * How a membership works, in four short lines from the published terms
 * (content/policy.ts), then the full detail a tap away on /memberships.
 * Read before choosing, so nothing restricts the visitor unexpectedly.
 */
export function PlanTerms({ className }: { className?: string }) {
  const days = isPublishable(timetable.status) ? listDays(sortSessions(timetable.sessions).map((s) => s.day)) : null;
  const points = [
    `One credit is one class${days ? `, on any ${days} class` : ""}.`,
    `Renews automatically every ${BILLING_WEEKS} weeks, with new credits.`,
    "Unused credits don't roll over.",
    "Cancel 24 hours or more before class and your credit comes back.",
  ];
  return (
    <div className={cn("text-sm", className)}>
      <ul className="space-y-1">
        {points.map((p) => (
          <li key={p} className="flex gap-2">
            <span aria-hidden="true">·</span>
            {p}
          </li>
        ))}
      </ul>
      <Link href="/memberships#how-it-works" className="mt-2 inline-flex min-h-11 items-center font-semibold underline underline-offset-4 hover:no-underline">
        How memberships work
      </Link>
    </div>
  );
}

/** "Monday, Wednesday or Saturday" */
function listDays(days: string[]): string {
  const unique = [...new Set(days)];
  return unique.length > 1 ? `${unique.slice(0, -1).join(", ")} or ${unique[unique.length - 1]}` : (unique[0] ?? "");
}

/** What pay as you go costs on top of each plan (owner, 2026-10-23). Secondary: on /memberships only. */
export function PaygExtra({ className }: { className?: string }) {
  return (
    <div className={className}>
      <h3 id="payg-extra" className="card-title">
        Pay as you go costs more
      </h3>
      <p className="mt-2 text-sm">What you&apos;d pay on top, going pay as you go instead of each plan, using every credit.</p>
      <div className="card mt-5 max-w-lg px-5 py-3 sm:px-6">
      <table aria-labelledby="payg-extra" className="w-full text-sm tabular-nums">
        <thead>
          <tr>
            <th scope="col" className="py-2 text-left font-normal">
              <span className="sr-only">Plan</span>
            </th>
            <th scope="col" className="py-2 text-right font-normal">Week</th>
            <th scope="col" className="py-2 text-right font-normal">{BILLING_WEEKS} weeks</th>
            <th scope="col" className="py-2 text-right font-semibold">Year</th>
          </tr>
        </thead>
        <tbody>
          {membershipPlans.map((plan) => {
            const x = extraCostPence(plan, payg.amountGbp);
            return (
              <tr key={plan.id}>
                <th scope="row" className="py-2 text-left font-normal">{plan.name}</th>
                <td className="py-2 text-right">{formatPenceShort(x.week)}</td>
                <td className="py-2 text-right">{formatPenceShort(x.period)}</td>
                <td className="py-2 text-right font-semibold">{formatPenceShort(x.year)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
    </div>
  );
}
