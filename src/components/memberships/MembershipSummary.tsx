import Link from "next/link";
import { membershipPlans, BILLING_WEEKS } from "@/content/memberships";
import { membershipKeyFacts } from "@/content/policy";
import { getService } from "@/content/services";
import { formatPenceShort, planFigures } from "@/lib/membership";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Section, SectionHeading } from "@/components/ui/Section";
import { cn } from "@/lib/cn";

const payg = getService("group-classes").prices[0];

/**
 * The homepage view of memberships: one row per plan with the price, credits,
 * cost per class and saving, the conditions in one line, and one button to
 * the full cards where each plan can be joined. Keeps the home page short.
 */
export function MembershipSummary() {
  return (
    <Section id="memberships" labelledBy="memberships-summary-heading">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-12">
        <div className="lg:col-span-4">
          <SectionHeading
            id="memberships-summary-heading"
            eyebrow="Kettlebell memberships"
            title="Train more, pay less per class"
            intro={`Pay as you go is £${payg.amountGbp} a class.`}
          />
          <ButtonLink href="/memberships" variant="action" className="mt-6 w-full sm:w-72">
            Compare and join
          </ButtonLink>
        </div>
        <div className="lg:col-span-8">
          <ul aria-labelledby="memberships-summary-heading" className="rounded-lg border border-grey bg-white">
            {membershipPlans.map((plan, i) => {
              const f = planFigures(plan, payg.amountGbp);
              return (
                <li
                  key={plan.id}
                  className={cn(
                    "grid grid-cols-[1fr_auto] items-baseline gap-x-4 gap-y-0.5 px-5 py-4 sm:grid-cols-[1fr_1.4fr_1fr_auto]",
                    i > 0 && "border-t border-grey",
                    plan.featured && "font-semibold",
                  )}
                >
                  <h3 className="font-display text-h3">{plan.name}</h3>
                  <p className="text-right sm:order-4">
                    <span className="text-xl font-semibold tabular-nums">£{plan.priceGbp}</span>
                    <span className="text-sm font-normal"> / {BILLING_WEEKS} weeks</span>
                  </p>
                  <p className="text-sm font-normal sm:order-2">
                    {plan.credits} credits · {formatPenceShort(f.perClassPence)} per class
                  </p>
                  <p className="text-right text-sm sm:order-3 sm:text-left">
                    <span className="sr-only">You save </span>Save {formatPenceShort(f.savingPence)}
                    <span className="font-normal"> vs {formatPenceShort(f.payAsYouGoPence)}</span>
                  </p>
                </li>
              );
            })}
            <li className="grid grid-cols-[1fr_auto] items-baseline gap-x-4 border-t border-grey px-5 py-4">
              <h3 className="font-display text-h3">Pay as you go</h3>
              <p className="text-right">
                <span className="text-xl font-semibold tabular-nums">£{payg.amountGbp}</span>
                <span className="text-sm"> per class</span>
              </p>
            </li>
          </ul>
          <p className="mt-4 text-sm">
            {membershipKeyFacts.slice(0, 3).map((f) => f.title).join(" · ")}. Savings compare with the £{payg.amountGbp} price and assume every credit is used.{" "}
            <Link href="/memberships#cancellation" className="font-semibold underline underline-offset-4 hover:no-underline">
              Cancellation policy
            </Link>
            .
          </p>
        </div>
      </div>
    </Section>
  );
}
