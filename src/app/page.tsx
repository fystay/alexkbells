import type { Metadata } from "next";
import { site } from "@/content/site";
import { pageMetadata } from "@/lib/metadata";
import { BILLING_WEEKS, membershipPlans } from "@/content/memberships";
import { getService } from "@/content/services";
import { timetable } from "@/content/classes";
import { formatPenceShort, maxSavingPence } from "@/lib/membership";
import { isPublishable } from "@/lib/publish";
import { CoachStory } from "@/components/home/CoachStory";
import { ClassTimes, classFacts } from "@/components/home/ClassTimes";
import { FirstSession } from "@/components/home/FirstSession";
import { Hero } from "@/components/home/Hero";
import { MoreWays } from "@/components/home/MoreWays";
import { PracticalInfo } from "@/components/home/PracticalInfo";
import { Testimonials } from "@/components/home/Testimonials";
import { PlanList, PlanTerms } from "@/components/memberships/PlanList";
import { Section, SectionHeading } from "@/components/ui/Section";

export const metadata: Metadata = pageMetadata({ description: site.description, path: "/" });

const payg = getService("group-classes").prices[0];

// Order (mobile-first redesign, 2026-10-24; first class added 2026-10-26): the
// film and Book now, then the classes and times, what a first class is like,
// what it costs, who coaches it, the other ways to train, and where to go. One
// idea per section, all on the cream page, separated by space (warm tech,
// 2026-10-26). Phones read top to bottom; from lg the heading sits left of its content.
const split = "lg:grid lg:grid-cols-12 lg:gap-x-14";
export default function HomePage() {
  const sessions = isPublishable(timetable.status) ? timetable.sessions.length : 0;
  return (
    <>
      <Hero />
      <Section id="classes" labelledBy="classes-heading">
        <div className={split}>
          <SectionHeading
            id="classes-heading"
            className="lg:col-span-5"
            title={sessions ? `${sessions} ${sessions === 1 ? "class" : "classes"} a week.` : "Kettlebell classes."}
            intro={sessions ? classFacts() : undefined}
          />
          <ClassTimes className="mt-8 lg:col-span-7 lg:mt-0" />
        </div>
      </Section>
      <FirstSession />
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
      <CoachStory tone="plain" />
      <Testimonials />
      <MoreWays />
      <PracticalInfo />
    </>
  );
}
