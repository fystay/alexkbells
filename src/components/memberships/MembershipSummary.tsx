import Link from "next/link";
import { membershipPlans, BILLING_WEEKS } from "@/content/memberships";
import { membershipKeyFacts } from "@/content/policy";
import { getService } from "@/content/services";
import { extraCostPence, formatPenceShort, maxSavingPence, planFigures } from "@/lib/membership";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Section, SectionHeading } from "@/components/ui/Section";
import { cn } from "@/lib/cn";
import { getPrimaryCtaFor, type CallToAction } from "@/lib/booking";
import { PlanCarousel } from "./PlanCarousel";
import { PlanSelectProvider, SelectPlanButton, SelectableCard, YourPlanBar } from "./PlanSelect";

const payg = getService("group-classes").prices[0];

/** Pay as you go's own link straight to booking (it has no plan to choose). */
function PlanLink({ href, label, external }: CallToAction) {
  return (
    <Link
      href={href}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className="mt-4 inline-flex min-h-11 items-center self-start text-sm font-semibold uppercase tracking-[0.08em] underline underline-offset-[6px] hover:no-underline"
    >
      {label}
      {external ? <span className="sr-only"> (opens in a new tab)</span> : null}
    </Link>
  );
}

/**
 * The homepage view of memberships: the heading, Compare and join, and the
 * plan cards (choose a plan, then Book now to the calendar).
 */
export function MembershipSummary() {
  return (
    <Section tone="white" id="memberships" labelledBy="memberships-summary-heading">
      <SectionHeading
        id="memberships-summary-heading"
        eyebrow="Kettlebell memberships"
        title={`Save up to ${formatPenceShort(maxSavingPence(membershipPlans, payg.amountGbp))} every ${BILLING_WEEKS} weeks`}
        intro={`Pay as you go is £${payg.amountGbp} a class. Every membership costs less per class.`}
      />
      <ButtonLink href="/memberships" variant="action" className="mt-6 w-full sm:w-72">
        Compare and join
      </ButtonLink>
      <PlanCards className="mt-8" />
    </Section>
  );
}

/**
 * The plan cards (Starter, Regular, Dedicated and Pay as you go, with its
 * extra-cost table) and the one-line conditions. The home page is the
 * reference (owner, 2026-10-23); /memberships shows exactly the same cards.
 */
export function PlanCards({ className }: { className?: string }) {
  const book = getPrimaryCtaFor("group-class");
  const card = "flex w-[82%] shrink-0 snap-start flex-col rounded-lg bg-white p-5 sm:w-[46%] sm:p-6 lg:w-auto";
  const choices = membershipPlans.map((p) => ({ id: p.id, name: p.name, priceGbp: p.priceGbp, credits: p.credits, weeks: BILLING_WEEKS }));
  return (
    <PlanSelectProvider>
      <div className={className}>
        <PlanCarousel label="Membership plans">
          {membershipPlans.map((plan) => {
            const f = planFigures(plan, payg.amountGbp);
            return (
              <SelectableCard
                key={plan.id}
                planId={plan.id}
                className={cn(
                  card,
                  plan.featured ? "border-2 border-ink" : "border border-grey",
                  "motion-safe:transition-colors data-[selected=true]:border-ink data-[selected=true]:bg-ink data-[selected=true]:text-white",
                )}
              >
                <h3 className="font-display text-h3">{plan.name}</h3>
                <p className="mt-4">
                  <span className="font-display text-4xl tabular-nums">£{plan.priceGbp}</span>
                  <span className="ml-1 text-sm"> / {BILLING_WEEKS} weeks</span>
                </p>
                <ul className="mt-4 flex-1 border-t border-grey pt-4 text-sm">
                  <li>{plan.credits} credits</li>
                  <li className="mt-2">{formatPenceShort(f.perClassPence)} per class</li>
                </ul>
                <p className="mt-5">
                  <span className="inline-flex items-baseline gap-1 rounded-md bg-ink px-2.5 py-1 font-semibold text-white group-data-[selected=true]:bg-white group-data-[selected=true]:text-ink">
                    <span className="sr-only">You save </span>Save {formatPenceShort(f.savingPence)}
                  </span>
                </p>
                <SelectPlanButton planId={plan.id} name={plan.name} />
              </SelectableCard>
            );
          })}
          <li className={cn(card, "border border-grey")}>
            <h3 className="font-display text-h3">Pay as you go</h3>
            <p className="mt-4">
              <span className="font-display text-4xl tabular-nums">£{payg.amountGbp}</span>
              <span className="ml-1 text-sm"> per class</span>
            </p>
            <div className="mt-4 flex-1 border-t border-grey pt-4 text-sm">
              <p>No membership needed.</p>
              {/* Owner, 2026-10-23: what pay as you go costs on top of each plan. */}
              <p id="payg-extra" className="eyebrow mt-6">
                Extra vs a membership
              </p>
              <table aria-labelledby="payg-extra" className="mt-3 w-full text-[0.8125rem] tabular-nums">
                <thead>
                  <tr>
                    <th scope="col" className="pb-2 text-left font-normal">
                      <span className="sr-only">Plan</span>
                    </th>
                    <th scope="col" className="pb-2 text-right font-normal">Week</th>
                    <th scope="col" className="pb-2 text-right font-normal">{BILLING_WEEKS} weeks</th>
                    <th scope="col" className="pb-2 text-right font-semibold">Year</th>
                  </tr>
                </thead>
                <tbody>
                  {membershipPlans.map((plan) => {
                    const x = extraCostPence(plan, payg.amountGbp);
                    return (
                      <tr key={plan.id}>
                        <th scope="row" className="py-1 text-left font-normal">{plan.name}</th>
                        <td className="py-1 text-right">{formatPenceShort(x.week)}</td>
                        <td className="py-1 text-right">{formatPenceShort(x.period)}</td>
                        <td className="py-1 text-right font-semibold">{formatPenceShort(x.year)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <PlanLink {...book} label="Book now" />
          </li>
        </PlanCarousel>
      </div>
      <YourPlanBar plans={choices} bookHref={book.href} external={book.external} />
      <p className="mt-4 text-sm">
        {membershipKeyFacts.slice(0, 3).map((f) => f.title).join(" · ")}. Savings compare with the £{payg.amountGbp} price and assume every credit is used.{" "}
        <Link href="/memberships#cancellation" className="font-semibold underline underline-offset-4 hover:no-underline">
          Cancellation policy
        </Link>
        .
      </p>
    </PlanSelectProvider>
  );
}
