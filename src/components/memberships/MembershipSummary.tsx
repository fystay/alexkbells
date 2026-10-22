import Link from "next/link";
import { membershipPlans, BILLING_WEEKS } from "@/content/memberships";
import { getService } from "@/content/services";
import { formatPenceShort, planFigures } from "@/lib/membership";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Section, SectionHeading } from "@/components/ui/Section";
import { cn } from "@/lib/cn";

const payg = getService("group-classes").prices[0];

/**
 * The homepage view of memberships: one quiet row per plan with the saving
 * at a glance, and one button to the full cards. The sign-up buttons live on
 * /memberships, so the home page stays short.
 */
export function MembershipSummary() {
  return (
    <Section tone="raised" id="memberships" labelledBy="memberships-summary-heading">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-4">
          <SectionHeading
            id="memberships-summary-heading"
            eyebrow="Kettlebell memberships"
            title="Train more, pay less per class"
            intro={`Pay as you go is £${payg.amountGbp} a class. Every membership brings each class down.`}
          />
          <ButtonLink href="/memberships" tone="dark" variant="action" className="mt-8 w-full sm:w-72">
            Compare memberships
          </ButtonLink>
        </div>
        <div className="lg:col-span-8">
          <ul aria-labelledby="memberships-summary-heading" className="border-b border-line-inverse">
            {membershipPlans.map((plan) => {
              const f = planFigures(plan, payg.amountGbp);
              return (
                <li
                  key={plan.id}
                  className={cn(
                    "grid grid-cols-[1fr_auto] items-baseline gap-x-6 gap-y-1 border-t border-line-inverse py-5 sm:grid-cols-[1.2fr_1fr_1fr_auto]",
                    plan.highlight && "bg-white px-4 sm:-mx-4 sm:px-4",
                  )}
                >
                  <h3 className="font-display text-h3">
                    {plan.name}
                    {plan.highlight ? <span className="eyebrow block whitespace-nowrap text-[0.625rem] text-muted-inverse sm:ml-3 sm:inline sm:align-middle">{plan.highlight}</span> : null}
                  </h3>
                  <p className="text-right sm:order-4 sm:text-left">
                    <span className="text-xl font-medium tabular-nums">£{plan.priceGbp}</span>
                    <span className="text-sm text-muted-inverse"> / {BILLING_WEEKS} weeks</span>
                  </p>
                  <p className="text-sm text-muted-inverse sm:order-2">
                    {plan.credits} credits · {formatPenceShort(f.perClassPence)} per class
                  </p>
                  <p className="text-right text-sm sm:order-3 sm:text-left">
                    <span className="sr-only">You save </span>
                    <span className="font-medium">Save {formatPenceShort(f.savingPence)}</span>
                    <span className="text-muted-inverse"> vs {formatPenceShort(f.payAsYouGoPence)}</span>
                  </p>
                </li>
              );
            })}
            <li className="grid grid-cols-[1fr_auto] items-baseline gap-x-6 border-t border-line-inverse py-5">
              <h3 className="font-display text-h3">Pay as you go</h3>
              <p className="text-right">
                <span className="text-xl font-medium tabular-nums">£{payg.amountGbp}</span>
                <span className="text-sm text-muted-inverse"> per class</span>
              </p>
            </li>
          </ul>
          <p className="mt-6 text-sm text-muted-inverse">
            Savings assume every credit is used in the four-week period.{" "}
            <Link href="/memberships#cancellation" className="font-semibold text-paper underline underline-offset-4 hover:no-underline">
              Cancellation policy
            </Link>
            .
          </p>
        </div>
      </div>
    </Section>
  );
}
