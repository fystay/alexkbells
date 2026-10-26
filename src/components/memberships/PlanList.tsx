import Link from "next/link";
import { BILLING_WEEKS, membershipPlans } from "@/content/memberships";
import { getService } from "@/content/services";
import { getPrimaryCtaFor } from "@/lib/booking";
import { extraCostPence, formatPenceShort, planFigures } from "@/lib/membership";
import { ChoiceCards, type Choice } from "@/components/ui/ChoiceCards";
import { ChoiceDot, choiceCard } from "@/components/ui/choice";
import { cn } from "@/lib/cn";

const payg = getService("group-classes").prices[0];

/**
 * The plans as one vertical list (mobile-first redesign, 2026-10-24): price,
 * credits and the cost per class on each row, compared top to bottom, with
 * Pay as you go last. Choose a row, then Book now (select, then continue, as
 * everywhere on the site); the calendar opens with the plan (`?plan=`). Home
 * and /memberships share it.
 */
export function PlanList({ className }: { className?: string }) {
  const book = getPrimaryCtaFor("group-class");
  const planHref = (id: string) => (book.kind === "booking" && !book.external ? `${book.href}?plan=${id}` : book.href);
  const choices: Choice[] = [
    ...membershipPlans.map((plan) => ({ value: plan.id, label: `${plan.name} plan`, href: planHref(plan.id), action: "Book now", external: book.external })),
    { value: "payg", label: "Pay as you go", href: book.href, action: "Book now", external: book.external },
  ];
  const row = "flex items-center gap-4 border-b border-grey bg-white px-4 py-4 sm:px-5";
  return (
    <ChoiceCards name="plan" legend="Choose a membership plan" choices={choices} idle="Book now" prompt="Choose a plan to continue." className={className}>
      <ul aria-label="Membership plans" className="overflow-hidden rounded-lg border border-ink">
        {membershipPlans.map((plan) => {
          const f = planFigures(plan, payg.amountGbp);
          return (
            <li key={plan.id} className={cn(row, choiceCard)}>
              <ChoiceDot name="plan" value={plan.id} label={`${plan.name}, £${plan.priceGbp} every ${BILLING_WEEKS} weeks, ${plan.credits} credits`} />
              <span className="min-w-0 flex-1">
                <h3 className="font-display text-h3 leading-tight">{plan.name}</h3>
                <span className="block text-sm">
                  {plan.credits} credits · {formatPenceShort(f.perClassPence)} a class
                </span>
              </span>
              <span className="text-right">
                <span className="block font-display text-2xl tabular-nums">£{plan.priceGbp}</span>
                <span className="block text-xs">/ {BILLING_WEEKS} weeks</span>
              </span>
            </li>
          );
        })}
        <li className={cn(row, "border-b-0", choiceCard)}>
          <ChoiceDot name="plan" value="payg" label={`Pay as you go, £${payg.amountGbp} per class`} />
          <span className="min-w-0 flex-1">
            <h3 className="font-display text-h3 leading-tight">Pay as you go</h3>
            <span className="block text-sm">No membership needed</span>
          </span>
          <span className="text-right">
            <span className="block font-display text-2xl tabular-nums">£{payg.amountGbp}</span>
            <span className="block text-xs">/ class</span>
          </span>
        </li>
      </ul>
    </ChoiceCards>
  );
}

/** The terms in one line, with the full detail a tap away on /memberships. */
export function PlanTerms({ className }: { className?: string }) {
  return (
    <p className={cn("text-sm", className)}>
      Renews every {BILLING_WEEKS} weeks · Credits expire at the end of each period · Cancel 24 hours ahead.{" "}
      <Link href="/memberships#how-it-works" className="font-semibold underline underline-offset-4 hover:no-underline">
        How memberships work
      </Link>
    </p>
  );
}

/** What pay as you go costs on top of each plan (owner, 2026-10-23). Secondary: on /memberships only. */
export function PaygExtra({ className }: { className?: string }) {
  return (
    <div className={className}>
      <h3 id="payg-extra" className="font-display text-h3">
        Pay as you go costs more
      </h3>
      <p className="mt-2 text-sm">What you&apos;d pay on top, going pay as you go instead of each plan, using every credit.</p>
      <table aria-labelledby="payg-extra" className="mt-4 w-full max-w-lg text-sm tabular-nums">
        <thead>
          <tr className="border-b border-ink">
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
              <tr key={plan.id} className="border-b border-grey">
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
  );
}
