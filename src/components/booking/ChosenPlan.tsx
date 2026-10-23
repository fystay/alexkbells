"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BILLING_WEEKS, membershipPlans, type MembershipPlan } from "@/content/memberships";

/**
 * The plan chosen on the membership cards (`?plan=regular`), shown above the
 * calendar so the visitor knows it came with them. Read after hydration so the
 * page itself stays static; an unknown or missing plan shows nothing.
 */
export function ChosenPlan() {
  const [plan, setPlan] = useState<MembershipPlan | null>(null);
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("plan");
    // Reading the URL is the external state being synced here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPlan(membershipPlans.find((p) => p.id === id) ?? null);
  }, []);
  if (!plan) return null;
  return (
    <p className="mt-5 flex max-w-2xl flex-wrap items-baseline justify-between gap-x-6 gap-y-1 rounded-lg border border-ink bg-white px-5 py-4">
      <span>
        <span className="eyebrow block">Your plan</span>
        <span className="mt-1 block font-semibold">
          {plan.name} · £{plan.priceGbp} / {BILLING_WEEKS} weeks · {plan.credits} class credits
        </span>
      </span>
      <Link href="/memberships#memberships" className="inline-flex min-h-11 items-center text-sm font-semibold underline underline-offset-4 hover:no-underline">
        Change<span className="sr-only"> plan</span>
      </Link>
    </p>
  );
}
