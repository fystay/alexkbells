import type { Metadata } from "next";
import { BILLING_WEEKS, membershipPlans } from "@/content/memberships";
import { getService } from "@/content/services";
import { formatPenceShort, maxSavingPence } from "@/lib/membership";
import { pageMetadata } from "@/lib/metadata";
import { Section } from "@/components/ui/Section";
import { CtaBand } from "@/components/sections/CtaBand";
import { PageHeader } from "@/components/sections/PageHeader";
import { CancellationPolicy } from "@/components/memberships/CancellationPolicy";
import { PaygExtra, PlanList } from "@/components/memberships/PlanList";
import { MembershipTerms } from "@/components/memberships/MembershipTerms";

export const metadata: Metadata = pageMetadata({
  title: "Kettlebell Memberships",
  description:
    "RAENG Fitness memberships: Starter, Regular and Dedicated, with class credits every four weeks and the saving against pay as you go. Cumbernauld, Glasgow.",
  path: "/memberships",
});

const payg = getService("group-classes").prices[0];

// Follows the home page's memberships section (owner, 2026-10-23): the same
// heading, wording and plan rows, then only what belongs here: the extra cost
// of pay as you go, Alex's full terms and the cancellation policy. No cards
// and no buttons above the plans (2026-10-26): choosing a plan is the action.
export default function MembershipsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Kettlebell memberships"
        title={`Save up to ${formatPenceShort(maxSavingPence(membershipPlans, payg.amountGbp))}.`}
        intro={`Every ${BILLING_WEEKS} weeks, against pay as you go at £${payg.amountGbp} a class.`}
      />
      <Section id="memberships" labelledBy="plans-heading">
        <h2 id="plans-heading" className="sr-only">
          Membership plans
        </h2>
        {/* The home page's plan list (the home page is the reference), then the detail that only belongs here. */}
        <PlanList className="max-w-2xl" />
        <PaygExtra className="mt-12" />
      </Section>
      <MembershipTerms />
      <CancellationPolicy />
      <CtaBand body={null} tone="plain" />
    </>
  );
}
