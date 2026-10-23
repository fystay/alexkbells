import Link from "next/link";
import { membershipPlans, BILLING_WEEKS } from "@/content/memberships";
import { membershipKeyFacts } from "@/content/policy";
import { getService } from "@/content/services";
import { extraCostPence, formatPenceShort, maxSavingPence, planFigures } from "@/lib/membership";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Section, SectionHeading } from "@/components/ui/Section";
import { cn } from "@/lib/cn";
import { getMembershipAction, getPrimaryCtaFor, type CallToAction } from "@/lib/booking";
import { PlanCarousel } from "./PlanCarousel";

const payg = getService("group-classes").prices[0];

/**
 * The homepage view of memberships: one card per plan (swipe sideways on
 * phones and tablets, four across on desktop) with the price, credits, cost
 * per class and saving, the conditions in one line, and one button to the
 * full cards where each plan can be joined.
 */
/** Each card's own action, so a visitor can act where they read the saving. */
function PlanLink({ href, label, external, kind }: CallToAction) {
  // Owner, 2026-10-23: plan cards say "Select" while joining goes through an enquiry
  // ("Enquire about Starter" -> "Select" + hidden " Starter"); "Join" once a join link is set.
  const enquiry = kind === "enquiry" && label.startsWith("Enquire about ");
  const verb = enquiry ? "Select" : kind === "booking" && label.startsWith("Join") ? "Join" : label;
  const rest = enquiry ? ` ${label.slice("Enquire about ".length)}` : verb === label ? "" : label.slice(verb.length);
  return (
    <Link
      href={href}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className="mt-4 inline-flex min-h-11 items-center self-start text-sm font-semibold uppercase tracking-[0.08em] underline underline-offset-[6px] hover:no-underline"
    >
      {verb}
      {rest ? <span className="sr-only">{rest}</span> : null}
      {external ? <span className="sr-only"> (opens in a new tab)</span> : null}
    </Link>
  );
}

export function MembershipSummary() {
  const book = getPrimaryCtaFor("group-class");
  const card = "flex w-[82%] shrink-0 snap-start flex-col rounded-lg bg-white p-5 sm:w-[46%] sm:p-6 lg:w-auto";
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
      <div className="mt-8">
        <PlanCarousel label="Membership plans">
          {membershipPlans.map((plan) => {
            const f = planFigures(plan, payg.amountGbp);
            return (
              <li key={plan.id} className={cn(card, plan.featured ? "border-2 border-ink" : "border border-grey")}>
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
                  <span className="inline-flex items-baseline gap-1 rounded-md bg-ink px-2.5 py-1 font-semibold text-white">
                    <span className="sr-only">You save </span>Save {formatPenceShort(f.savingPence)}
                  </span>
                </p>
                <PlanLink {...getMembershipAction(plan.name, plan.id)} />
              </li>
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
      <p className="mt-4 text-sm">
        {membershipKeyFacts.slice(0, 3).map((f) => f.title).join(" · ")}. Savings compare with the £{payg.amountGbp} price and assume every credit is used.{" "}
        <Link href="/memberships#cancellation" className="font-semibold underline underline-offset-4 hover:no-underline">
          Cancellation policy
        </Link>
        .
      </p>
    </Section>
  );
}
