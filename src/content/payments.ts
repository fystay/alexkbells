/**
 * How Alex takes payment (his class listing, 2026-10-17: "Bank transfer or
 * cash for now"). The coach portal offers only these methods when recording
 * a payment; add one here (and to the akb_payments check in Supabase, which
 * already allows "card" and "other") when he starts taking it.
 */
export const paymentMethods = [
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "cash", label: "Cash" },
] as const;

export type PaymentMethod = (typeof paymentMethods)[number]["value"];
