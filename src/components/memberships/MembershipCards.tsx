import { membershipPlans, BILLING_WEEKS, type MembershipPlan } from "@/content/memberships";
import { getService } from "@/content/services";
import { formatPenceShort, planFigures } from "@/lib/membership";
import { getMembershipAction, getPrimaryCtaFor } from "@/lib/booking";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { revealDelay } from "@/lib/reveal";
import { cn } from "@/lib/cn";

const payg = getService("group-classes").prices[0];

function PlanCard({ plan, index }: { plan: MembershipPlan; index: number }) {
  const f = planFigures(plan, payg.amountGbp);
  const action = getMembershipAction(plan.name, plan.id);
  return (
    <li
      data-reveal
      style={revealDelay(index)}
      className={cn("flex flex-col rounded-lg bg-white p-7 sm:p-8", plan.featured ? "border-2 border-ink" : "border border-grey")}
    >
      <h3 className="font-display text-h3">{plan.name}</h3>
      <p className="mt-5">
        <span className="font-display text-5xl tabular-nums">£{plan.priceGbp}</span>
        <span className="ml-2 text-sm"> / {BILLING_WEEKS} weeks</span>
      </p>
      <p className="mt-2 text-lg font-semibold">{plan.credits} class credits</p>

      <dl className="mt-6 border-t border-grey pt-5">
        <div className="flex items-baseline justify-between gap-3">
          <dt className="text-sm">Per class</dt>
          <dd className="font-semibold tabular-nums">{formatPenceShort(f.perClassPence)}</dd>
        </div>
        <div className="mt-3 flex items-baseline justify-between gap-3">
          <dt className="text-sm">Pay as you go</dt>
          <dd className="tabular-nums">{formatPenceShort(f.payAsYouGoPence)}</dd>
        </div>
        <div className="mt-3 flex items-baseline justify-between gap-3 border-t border-grey pt-3">
          <dt className="text-sm font-semibold">You save</dt>
          <dd className="font-display text-2xl tabular-nums">{formatPenceShort(f.savingPence)}</dd>
        </div>
      </dl>

      <ButtonLink
        href={action.href}
        external={action.external}
        variant={plan.featured ? "primary" : "secondary"}
        className="mt-7 w-full"
      >
        {action.kind === "enquiry" ? "Enquire" : "Join"}
        <span className="sr-only">{action.kind === "enquiry" ? ` about ${plan.name}` : ` ${plan.name}`}</span>
      </ButtonLink>
    </li>
  );
}

/**
 * The three memberships side by side (stacked on phones), with pay as you go
 * as a plain row beneath. The middle plan has the heavier border: a style, not a claim.
 */
export function MembershipCards({ labelledBy }: { labelledBy: string }) {
  const action = getPrimaryCtaFor("group-class");
  return (
    <>
      <ul aria-labelledby={labelledBy} className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {membershipPlans.map((plan, i) => (
          <PlanCard key={plan.id} plan={plan} index={i} />
        ))}
      </ul>
      <div className="mt-5 flex flex-col gap-4 rounded-lg border border-grey p-6 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <div>
          <h3 className="font-display text-h3">Pay as you go</h3>
          <p className="mt-1">
            <span className="text-lg font-semibold tabular-nums">£{payg.amountGbp}</span> per class. No membership needed.
          </p>
        </div>
        <ButtonLink href={action.href} external={action.external} variant="secondary" className="w-full sm:w-auto">
          Book a class
        </ButtonLink>
      </div>
    </>
  );
}
