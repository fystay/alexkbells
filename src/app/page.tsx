import type { Metadata } from "next";
import { site } from "@/content/site";
import { pageMetadata } from "@/lib/metadata";
import { BILLING_WEEKS, membershipPlans } from "@/content/memberships";
import { getService } from "@/content/services";
import { timetable } from "@/content/classes";
import { formatPenceShort, maxSavingPence } from "@/lib/membership";
import { isPublishable } from "@/lib/publish";
import { CoachIntro } from "@/components/home/CoachIntro";
import { CoachStory } from "@/components/home/CoachStory";
import { JoinSteps } from "@/components/home/JoinSteps";
import { Hero } from "@/components/home/Hero";
import { MoreWays } from "@/components/home/MoreWays";
import { Testimonials } from "@/components/home/Testimonials";
import { WhyKettlebells } from "@/components/home/WhyKettlebells";
import { PlanList, PlanTerms } from "@/components/memberships/PlanList";
import { CtaBand } from "@/components/sections/CtaBand";
import { Section, SectionHeading } from "@/components/ui/Section";

export const metadata: Metadata = pageMetadata({ description: site.description, path: "/" });

const payg = getService("group-classes").prices[0];

// Alex's order (WhatsApp 15 Oct 2026): where and how to book, what I offer,
// why kettlebells, about me. Reorganised 2026-10-26 (owner): the film and
// Book now; a slim "Coached by Alex" line that jumps to his story (a face
// early, without moving "About me" up); the classes as three steps (times,
// booking, where and what a first class is like) ending in Book now; what
// Alex offers (memberships, then the other ways to train); why kettlebells;
// who coaches it (and members' words, once there are any); and a last Book
// now. No cards on these sections (owner, 2026-10-26: less scrolling): rows
// between thin rules and space. Phones read top to bottom; from lg the
// heading sits left of its content.
const split = "lg:grid lg:grid-cols-12 lg:gap-x-14";
export default function HomePage() {
  const sessions = isPublishable(timetable.status) ? timetable.sessions.length : 0;
  return (
    <>
      <Hero />
      <CoachIntro />
      <Section id="classes" labelledBy="classes-heading">
        <div className={split}>
          <SectionHeading
            id="classes-heading"
            className="lg:col-span-5"
            title={sessions ? `${sessions} ${sessions === 1 ? "class" : "classes"} a week.` : "Kettlebell classes."}
          />
          <JoinSteps className="mt-4 lg:col-span-7 lg:mt-0" />
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
      <WhyKettlebells />
      <CoachStory tone="plain" />
      <Testimonials />
      <CtaBand id="book" tone="plain" />
    </>
  );
}
