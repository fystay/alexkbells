import { membershipPlans, BILLING_WEEKS, type MembershipPlan } from "@/content/memberships";
import { getService } from "@/content/services";
import { formatPenceShort, planFigures } from "@/lib/membership";
import { getMembershipAction, getPrimaryCtaFor } from "@/lib/booking";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { revealDelay } from "@/lib/reveal";
import { cn } from "@/lib/cn";

const payg = getService("group-classes").prices[0];

/** Pay-as-you-go against membership as two bars, so the saving reads before any number is read. Decorative: the figures are in the text. */
function SavingBar({ price, payAsYouGo, dark }: { price: number; payAsYouGo: number; dark: boolean }) {
  const track = dark ? "bg-ink/15" : "bg-paper/15";
  const fill = dark ? "bg-ink" : "bg-paper";
  return (
    <div aria-hidden="true" className="mt-4 space-y-1.5">
      <div className={cn("h-1 w-full rounded-full", track)} />
      <div className={cn("h-1 rounded-full", fill)} style={{ width: `${Math.round((price / payAsYouGo) * 100)}%` }} />
    </div>
  );
}

function PlanCard({ plan, index }: { plan: MembershipPlan; index: number }) {
  const f = planFigures(plan, payg.amountGbp);
  const action = getMembershipAction(plan.name);
  // The highlighted plan is the one cream card on the dark page; the rest are barely-there glass.
  const dark = Boolean(plan.highlight);
  const muted = dark ? "text-ink/65" : "text-muted-inverse";

  return (
    <li
      data-reveal
      style={revealDelay(index)}
      className={cn("flex flex-col rounded-3xl p-7 sm:p-8", dark ? "bg-paper text-ink" : "border border-line-inverse bg-white")}
    >
      {/* Every card reserves this line so the names align; only the highlighted plan has text in it. */}
      <p className={cn("eyebrow h-4 text-[0.6875rem]", muted)}>{plan.highlight ?? ""}</p>
      <h3 className="mt-1 font-display text-h3">{plan.name}</h3>
      <p className="mt-5">
        <span className="font-display text-4xl tabular-nums">£{plan.priceGbp}</span>
        <span className={cn("ml-2 text-sm", muted)}>/ {BILLING_WEEKS} weeks</span>
      </p>
      <p className="mt-2 font-semibold">{plan.credits} class credits</p>
      <p className={cn("text-sm", muted)}>per {BILLING_WEEKS}-week period</p>

      <dl className={cn("mt-6 border-t pt-5", dark ? "border-ink/15" : "border-line-inverse")}>
        <div className="flex items-baseline justify-between gap-3">
          <dt className={cn("text-sm", muted)}>Cost per class</dt>
          <dd className="font-medium tabular-nums">{formatPenceShort(f.perClassPence)}</dd>
        </div>
        <div className="mt-3 flex items-baseline justify-between gap-3">
          <dt className={cn("text-sm", muted)}>Pay as you go</dt>
          <dd className="tabular-nums">{formatPenceShort(f.payAsYouGoPence)}</dd>
        </div>
        <div className="mt-3 flex items-baseline justify-between gap-3">
          <dt className="text-sm font-semibold">You save</dt>
          <dd className="font-display text-xl tabular-nums">{formatPenceShort(f.savingPence)}</dd>
        </div>
      </dl>
      <SavingBar price={plan.priceGbp} payAsYouGo={f.payAsYouGoPence / 100} dark={dark} />
      <p className={cn("mt-2 text-xs", muted)}>Saving per {BILLING_WEEKS} weeks when all {plan.credits} credits are used.</p>

      <ButtonLink
        href={action.href}
        external={action.external}
        tone={dark ? "light" : "dark"}
        variant="primary"
        className="mt-6 w-full rounded-full"
      >
        {action.kind === "enquiry" ? "Enquire" : "Join"}
        <span className="sr-only">{action.kind === "enquiry" ? ` about ${plan.name}` : ` ${plan.name}`}</span>
      </ButtonLink>
    </li>
  );
}

/** Pay-as-you-go sits beside the memberships as the plain alternative: no credits, no saving, no commitment. */
function PayAsYouGoCard({ index }: { index: number }) {
  const action = getPrimaryCtaFor("group-class");
  return (
    <li data-reveal style={revealDelay(index)} className="flex flex-col rounded-3xl border border-line-inverse p-7 sm:p-8">
      <h3 className="font-display text-h3">Pay as you go</h3>
      <p className="mt-5">
        <span className="font-display text-4xl tabular-nums">£{payg.amountGbp}</span>
        <span className="ml-2 text-sm text-muted-inverse">per class</span>
      </p>
      <p className="mt-2 font-semibold">Individual classes</p>
      <p className="text-sm text-muted-inverse">No membership credit allowance.</p>
      <div className="flex-1" />
      <ButtonLink href={action.href} external={action.external} tone="dark" variant="secondary" className="mt-6 w-full whitespace-normal text-center">
        {action.label}
      </ButtonLink>
    </li>
  );
}

/** The four options, one card each: stacked on phones, two across on tablets, four across on wide screens. */
export function MembershipCards({ labelledBy }: { labelledBy: string }) {
  return (
    <ul aria-labelledby={labelledBy} className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 xl:gap-5">
      {membershipPlans.map((plan, i) => (
        <PlanCard key={plan.id} plan={plan} index={i} />
      ))}
      <PayAsYouGoCard index={membershipPlans.length} />
    </ul>
  );
}
