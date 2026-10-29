import { BILLING_WEEKS, type MembershipPlan } from "@/content/memberships";

/** Everything a membership card shows beyond its price, in whole pence. */
export interface PlanFigures {
  /** Credits × pay-as-you-go price. */
  payAsYouGoPence: number;
  /** Pay-as-you-go equivalent minus the membership price, assuming every credit is used. */
  savingPence: number;
  /** Membership price ÷ credits, rounded to the nearest penny (halves round up). */
  perClassPence: number;
}

/** Works in pence throughout, so rounding never depends on floating-point pounds. */
export function planFigures(
  plan: MembershipPlan,
  payAsYouGoGbp: number,
): PlanFigures {
  const pricePence = plan.priceGbp * 100;
  const payAsYouGoPence = plan.credits * payAsYouGoGbp * 100;
  return {
    payAsYouGoPence,
    savingPence: payAsYouGoPence - pricePence,
    perClassPence: Math.round(pricePence / plan.credits),
  };
}

/** 4000 -> "£40"; 813 -> "£8.13". Whole pounds drop the ".00". */
export function formatPenceShort(pence: number): string {
  const pounds = pence / 100;
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: pence % 100 === 0 ? 0 : 2,
  }).format(pounds);
}

/** The biggest saving any plan offers over pay as you go, in pence (every credit used). */
export function maxSavingPence(
  plans: readonly MembershipPlan[],
  payAsYouGoGbp: number,
): number {
  return Math.max(
    ...plans.map((p) => planFigures(p, payAsYouGoGbp).savingPence),
  );
}

/**
 * What pay as you go costs on top of a plan, for someone who goes to as many
 * classes as the plan has credits: per week, per billing period and per
 * 52-week year (13 periods), in pence.
 */
export function extraCostPence(
  plan: MembershipPlan,
  payAsYouGoGbp: number,
): { week: number; period: number; year: number } {
  const period = planFigures(plan, payAsYouGoGbp).savingPence;
  return {
    week: Math.round(period / BILLING_WEEKS),
    period,
    year: (period * 52) / BILLING_WEEKS,
  };
}

/**
 * For someone who paid for `classes` classes singly in 4 weeks: the plan that
 * would have cost them least, and how much less (pence), counting any classes
 * beyond the plan's credits at the pay-as-you-go price. Null when no plan
 * would have been cheaper. Shown on a pay-as-you-go customer's account.
 */
export function bestPlanFor(
  plans: readonly MembershipPlan[],
  classes: number,
  payAsYouGoGbp: number,
): { plan: MembershipPlan; savingPence: number } | null {
  const paid = classes * payAsYouGoGbp * 100;
  let best: { plan: MembershipPlan; savingPence: number } | null = null;
  for (const plan of plans) {
    const cost =
      plan.priceGbp * 100 +
      Math.max(0, classes - plan.credits) * payAsYouGoGbp * 100;
    const savingPence = paid - cost;
    if (savingPence > 0 && (!best || savingPence > best.savingPence))
      best = { plan, savingPence };
  }
  return best;
}

/**
 * What training `perWeek` classes a week would cost over one billing period
 * (4 weeks) as pay as you go and on the cheapest plan for that many classes
 * (any beyond the plan's credits counted at the pay-as-you-go price), in pence.
 * `savingPence` is 0 or less when pay as you go is the better deal. Shown on
 * /classes as "How often will you train?"; every figure comes from the prices.
 */
export function costForFrequency(
  plans: readonly MembershipPlan[],
  perWeek: number,
  payAsYouGoGbp: number,
): {
  classes: number;
  payAsYouGoPence: number;
  plan: MembershipPlan;
  planPence: number;
  savingPence: number;
} {
  const classes = perWeek * BILLING_WEEKS;
  const payAsYouGoPence = classes * payAsYouGoGbp * 100;
  let best = { plan: plans[0], planPence: Infinity };
  for (const plan of plans) {
    const planPence =
      plan.priceGbp * 100 +
      Math.max(0, classes - plan.credits) * payAsYouGoGbp * 100;
    if (planPence < best.planPence) best = { plan, planPence };
  }
  return {
    classes,
    payAsYouGoPence,
    plan: best.plan,
    planPence: best.planPence,
    savingPence: payAsYouGoPence - best.planPence,
  };
}
