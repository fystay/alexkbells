import type { Metadata } from "next";
import { site } from "@/content/site";
import { pageMetadata } from "@/lib/metadata";
import { CoachStory } from "@/components/home/CoachStory";
import { FindYourTraining } from "@/components/home/FindYourTraining";
import { Hero } from "@/components/home/Hero";
import { FirstClass } from "@/components/home/FirstClass";
import { Testimonials } from "@/components/home/Testimonials";
import { QuickFacts } from "@/components/home/QuickFacts";
import { PracticalInfo } from "@/components/home/PracticalInfo";
import { WhyKettlebells } from "@/components/home/WhyKettlebells";
import { StickyBook } from "@/components/home/StickyBook";
import { hero } from "@/content/home";
import { membershipPlans } from "@/content/memberships";
import { getService } from "@/content/services";
import { getPrimaryCtaFor } from "@/lib/booking";
import { formatPenceShort, planFigures } from "@/lib/membership";
import { publishable } from "@/lib/publish";
import { MembershipSummary } from "@/components/memberships/MembershipSummary";

export const metadata: Metadata = pageMetadata({ description: site.description, path: "/" });

// Order (owner, 2026-10-23): the film, then who Alex is (the strongest proof),
// why kettlebells, the classes, what's on offer, memberships, then where to go.
// Section backgrounds alternate cream / white down the page.
export default function HomePage() {
  const cta = getPrimaryCtaFor("group-class");
  const price = publishable(getService("group-classes").prices)[0];
  const lowest = price ? Math.min(...membershipPlans.map((p) => planFigures(p, price.amountGbp).perClassPence)) : null;
  return (
    <>
      <Hero />
      <CoachStory />
      <WhyKettlebells />
      <QuickFacts />
      <FirstClass />
      <FindYourTraining />
      <MembershipSummary />
      <Testimonials />
      <PracticalInfo />
      <StickyBook
        href={cta.href}
        label={cta.kind === "booking" ? hero.primaryLabel : cta.label}
        external={cta.external}
        price={lowest !== null ? `From only ${formatPenceShort(lowest)} a class` : null}
      />
    </>
  );
}
