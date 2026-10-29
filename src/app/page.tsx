import type { Metadata } from "next";
import { site } from "@/content/site";
import { pageMetadata } from "@/lib/metadata";
import { CoachStory } from "@/components/home/CoachStory";
import { ClassPicker, classesTitle } from "@/components/home/ClassPicker";
import { Hero } from "@/components/home/Hero";
import { homeCoach } from "@/content/home";
import { MoreWays } from "@/components/home/MoreWays";
import { Testimonials } from "@/components/home/Testimonials";
import { WhyKettlebells } from "@/components/home/WhyKettlebells";
import { PlanList, PlanTerms } from "@/components/memberships/PlanList";
import { CtaBand } from "@/components/sections/CtaBand";
import { Section, SectionHeading } from "@/components/ui/Section";

export const metadata: Metadata = pageMetadata({ description: site.description, path: "/" });

// Home order (the owner relaying Alex's feedback, 2026-10-29; replaces the
// 2026-10-27 order, which had the slim "Coached by" line and Meet your coach
// near the top): the film and Book now; why kettlebells; the classes (rows of
// days and times, one Book now, the address); what Alex offers (memberships,
// then the other ways to train); then Meet your coach (and members' words,
// once there are any), "less about me"; and a last Book now.
// Phones read top to bottom; from lg the heading sits left of its content.
const split = "lg:grid lg:grid-cols-12 lg:gap-x-14";
export default function HomePage() {
  return (
    <>
      <Hero />
      <WhyKettlebells />
      <Section id="classes" labelledBy="classes-heading">
        <div className={split}>
          {/* The owner's class times (2026-10-28), also on /classes; the count comes from the timetable. */}
          <SectionHeading id="classes-heading" className="lg:col-span-5" eyebrow="Classes" title={classesTitle()} />
          <ClassPicker className="mt-8 lg:col-span-7 lg:mt-0" />
        </div>
      </Section>
      {/* Alex via the owner, 2026-10-29: no "Save up to" line or intro (each price says "every 4 weeks"), and less space before the next section. */}
      <Section id="memberships" labelledBy="memberships-heading" className="pb-4 sm:pb-8 lg:pb-12">
        <div className={split}>
          <SectionHeading id="memberships-heading" className="lg:col-span-5" title="Memberships." />
          <div className="mt-8 lg:col-span-7 lg:mt-0">
            <PlanList />
            <PlanTerms className="mt-8" />
          </div>
        </div>
      </Section>
      <MoreWays />
      <CoachStory tone="plain" alex={homeCoach} />
      <Testimonials />
      <CtaBand id="book" body={null} instagram={false} tone="plain" />
    </>
  );
}
