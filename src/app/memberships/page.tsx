import type { Metadata } from "next";
import { NightPage } from "@/components/ui/NightPage";
import { pageMetadata } from "@/lib/metadata";
import { getPrimaryCtaFor } from "@/lib/booking";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { CtaBand } from "@/components/sections/CtaBand";
import { PageHeader } from "@/components/sections/PageHeader";
import { CancellationPolicy } from "@/components/memberships/CancellationPolicy";
import { MembershipSection } from "@/components/memberships/MembershipSection";
import { MembershipTerms } from "@/components/memberships/MembershipTerms";

export const metadata: Metadata = pageMetadata({
  title: "Kettlebell Memberships",
  description:
    "RAENG Kettlebell Club memberships: Starter, Regular and Dedicated, with class credits every four weeks and the saving against pay as you go. Cumbernauld, Glasgow.",
  path: "/memberships",
});

export default function MembershipsPage() {
  const booking = getPrimaryCtaFor("group-class");
  return (
    <NightPage>
      <PageHeader
        eyebrow="Memberships"
        title="Kettlebell memberships"
        intro="Class credits every four weeks for Monday, Wednesday and Saturday classes, at a lower cost per class than paying as you go."
      >
        <ButtonLink href="#memberships" tone="dark" variant="action" className="w-full sm:w-72">
          Compare memberships
        </ButtonLink>
        <ButtonLink href={booking.href} external={booking.external} tone="dark" variant="text" className="self-center sm:ml-4">
          Or book a single class
        </ButtonLink>
      </PageHeader>
      <MembershipSection showTermsLink={false} />
      <MembershipTerms />
      <CancellationPolicy />
      <CtaBand />
    </NightPage>
  );
}
