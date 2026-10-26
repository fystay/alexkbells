import Link from "next/link";
import { BILLING_WEEKS, membershipPlans } from "@/content/memberships";
import { PlanFlag } from "./PlanFlag";

/**
 * The plan chosen on the plan list (`?plan=regular`), shown above the
 * calendar so the visitor knows it came with them, and what happens next.
 * Every plan's box is in the static page, hidden; `<html data-plan>` (set
 * before first paint by PLAN_SCRIPT, or by PlanFlag after an in-app
 * navigation) shows the matching one, so nothing shifts as the page loads
 * (measured 2026-10-26: layout shift 0.156 when the box appeared after
 * hydration). An unknown or missing plan shows nothing.
 */
export function ChosenPlan() {
  const rules = membershipPlans.map((p) => `html[data-plan="${p.id}"] [data-plan-box="${p.id}"]{display:flex}`).join("");
  return (
    <>
      <style>{rules}</style>
      <PlanFlag />
      {membershipPlans.map((plan) => (
        <div
          key={plan.id}
          data-plan-box={plan.id}
          className="mt-5 hidden max-w-2xl flex-wrap items-baseline justify-between gap-x-6 gap-y-1 rounded-2xl border border-ink bg-white px-5 py-4"
        >
          <p>
            <span className="eyebrow block">Your plan</span>
            <span className="mt-1 block font-semibold">
              {plan.name} · £{plan.priceGbp} / {BILLING_WEEKS} weeks · {plan.credits} class credits
            </span>
            {/* What happens next, before the visitor commits (2026-10-26): no online payment. */}
            <span className="mt-1 block text-sm">Pick your first class. Alex sets up your membership when he confirms it. Nothing to pay now.</span>
          </p>
          <Link href="/memberships#memberships" className="inline-flex min-h-11 items-center text-sm font-semibold underline underline-offset-4 hover:no-underline">
            Change<span className="sr-only"> plan</span>
          </Link>
        </div>
      ))}
    </>
  );
}
