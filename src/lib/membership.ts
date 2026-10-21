import type { MembershipPlan } from "@/content/memberships";

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
export function planFigures(plan: MembershipPlan, payAsYouGoGbp: number): PlanFigures {
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
