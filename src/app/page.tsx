import type { Metadata } from "next";
import { site } from "@/content/site";
import { pageMetadata } from "@/lib/metadata";
import { BILLING_WEEKS, membershipPlans } from "@/content/memberships";
import { getService } from "@/content/services";
import { formatPenceShort, maxSavingPence } from "@/lib/membership";
import { CoachIntro } from "@/components/home/CoachIntro";
import { CoachStory } from "@/components/home/CoachStory";
import { JoinSteps } from "@/components/home/JoinSteps";
import { firstClassSteps } from "@/content/home";
import { Hero } from "@/components/home/Hero";
import { MoreWays } from "@/components/home/MoreWays";
import { Testimonials } from "@/components/home/Testimonials";
import { WhyKettlebells } from "@/components/home/WhyKettlebells";
import { PlanList, PlanTerms } from "@/components/memberships/PlanList";
import { CtaBand } from "@/components/sections/CtaBand";
import { Section, SectionHeading } from "@/components/ui/Section";

export const metadata: Metadata = pageMetadata({ description: site.description, path: "/" });

const payg = getService("group-classes").prices[0];

// Alex's order (WhatsApp 15 Oct 2026), reorganised 2026-10-26 and again
// 2026-10-27 (owner): the film and Book now; a slim "Coached by Alex" line that
// jumps to his story; then why kettlebells and who coaches it (and members'
// words, once there are any), moved up so the why and the who come first; then
// the classes as three steps (times, booking, where and what a first class is
// like) ending in Book now; what Alex offers (memberships, then the other ways
// to train); and a last Book now. No cards on these sections (owner,
// 2026-10-26: less scrolling): space rather than rules. Phones read top to
// bottom; from lg the heading sits left of its content.
const split = "lg:grid lg:grid-cols-12 lg:gap-x-14";
export default function HomePage() {
  return (
    <>
      <Hero />
      <CoachIntro />
      {/* Why kettlebells and Meet your coach sit straight under the hero (owner, 2026-10-27): the why and the who come before the classes, memberships and other ways to train. */}
      <WhyKettlebells />
      <CoachStory tone="plain" />
      <Testimonials />
      <Section id="classes" labelledBy="classes-heading">
        <div className={split}>
          {/* A cleaner title (owner, 2026-10-26): the class count is in the rows of step 1. */}
          <SectionHeading id="classes-heading" className="lg:col-span-5" eyebrow="Classes" title={firstClassSteps.title} />
          <JoinSteps swipe className="mt-8 lg:col-span-7 lg:mt-0" />
        </div>
      </Section>
      <Section id="memberships" labelledBy="memberships-heading">
        <div className={split}>
          <SectionHeading
            id="memberships-heading"
            className="lg:col-span-5"
            eyebrow="Memberships"
            title={`Save up to ${formatPenceShort(maxSavingPence(membershipPlans, payg.amountGbp))}.`}
            intro={`Every ${BILLING_WEEKS} weeks, against pay as you go.`}
          />
          <div className="mt-8 lg:col-span-7 lg:mt-0">
            <PlanList />
            <PlanTerms className="mt-8" />
          </div>
        </div>
      </Section>
      <MoreWays />
      <CtaBand id="book" body={null} instagram={false} tone="plain" />
    </>
  );
}
