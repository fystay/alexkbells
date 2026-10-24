/**
 * Kettlebell Club memberships, as supplied by the owner (2026-10-21, restated
 * 2026-10-22). Only the price and the number of credits are stored: the
 * pay-as-you-go equivalent, the saving and the cost per class are always
 * calculated (lib/membership.ts), so they can never disagree with the prices.
 * The pay-as-you-go price is the group class price in services.ts.
 */
export interface MembershipPlan {
  id: "starter" | "regular" | "dedicated";
  name: string;
  /** Whole pounds per billing period. */
  priceGbp: number;
  /** Class credits per billing period. */
  credits: number;
  /** Drawn with the heavier border as the balanced middle option. A style only: no badge, no claim of popularity. */
  featured?: boolean;
}

/** Length of one membership period, in weeks. */
export const BILLING_WEEKS = 4;

export const membershipPlans: MembershipPlan[] = [
  { id: "starter", name: "Starter", priceGbp: 40, credits: 4 },
  { id: "regular", name: "Regular", priceGbp: 65, credits: 8, featured: true },
  { id: "dedicated", name: "Dedicated", priceGbp: 85, credits: 12 },
];
