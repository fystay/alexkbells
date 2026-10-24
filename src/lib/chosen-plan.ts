import { useSyncExternalStore } from "react";
import { membershipPlans, type MembershipPlan } from "@/content/memberships";

/**
 * The membership plan chosen on the plan cards, carried to the booking page as
 * `?plan=<id>` (owner, 2026-10-23). Validated against the real plans: anything
 * else means no plan. The server checks it again (lib/booking-request.ts).
 */
export function planFromId(id: string | null | undefined): MembershipPlan | null {
  return membershipPlans.find((p) => p.id === id) ?? null;
}

const noSubscribe = () => () => {};

/** Client components: a query parameter of the current URL (null while server rendering). */
export function useQueryParam(name: string): string | null {
  return useSyncExternalStore(
    noSubscribe,
    () => new URLSearchParams(window.location.search).get(name),
    () => null,
  );
}

/** Client components: the plan in the current URL, or null (and null while server rendering). */
export function useChosenPlan(): MembershipPlan | null {
  return planFromId(useQueryParam("plan"));
}
