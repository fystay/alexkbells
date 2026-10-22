import type { Metadata } from "next";
import { site } from "@/content/site";
import { pageMetadata } from "@/lib/metadata";
import { CoachStory } from "@/components/home/CoachStory";
import { FindYourTraining } from "@/components/home/FindYourTraining";
import { Hero } from "@/components/home/Hero";
import { PracticalInfo } from "@/components/home/PracticalInfo";
import { WhyKettlebells } from "@/components/home/WhyKettlebells";
import { CtaBand } from "@/components/sections/CtaBand";
import { MembershipSection } from "@/components/memberships/MembershipSection";

export const metadata: Metadata = pageMetadata({ description: site.description, path: "/" });

// Order follows what visitors want to know: how to book, what's on offer, why
// kettlebells, the memberships, who Alex is, then the practical details.
export default function HomePage() {
  return (
    <>
      <Hero />
      <FindYourTraining />
      <WhyKettlebells />
      <MembershipSection />
      <CoachStory />
      <PracticalInfo />
      <CtaBand />
    </>
  );
}
