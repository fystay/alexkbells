import { membershipPlans } from "@/content/memberships";

/** `<html data-plan="regular">`: which "Your plan" box the booking page shows. */
export const PLAN_ATTRIBUTE = "data-plan";

const IDS: readonly string[] = membershipPlans.map((p) => p.id);

/** The plan id in a query string, if it's a real plan. */
export function planFromSearch(search: string): string | null {
  const id = new URLSearchParams(search).get("plan");
  return id && IDS.includes(id) ? id : null;
}

/**
 * Runs in <head> before first paint on the booking pages' full loads: marks
 * `<html>` with a valid `?plan=` so the pre-rendered box shows from the first
 * frame. Only real plan ids are ever written.
 */
export const PLAN_SCRIPT = `(function(){try{var p=new URLSearchParams(location.search).get("plan");if(p&&${JSON.stringify(IDS)}.indexOf(p)>-1)document.documentElement.setAttribute("${PLAN_ATTRIBUTE}",p)}catch(e){}})();`;
