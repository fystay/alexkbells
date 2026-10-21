import type { Metadata } from "next";
import { NightPage } from "@/components/ui/NightPage";
import { site } from "@/content/site";
import { pageMetadata } from "@/lib/metadata";
import { CoachStory } from "@/components/home/CoachStory";
import { FindYourTraining } from "@/components/home/FindYourTraining";
import { Hero } from "@/components/home/Hero";
import { Statement } from "@/components/home/Statement";
import { CtaBand } from "@/components/sections/CtaBand";
import { MembershipSection } from "@/components/memberships/MembershipSection";

export const metadata: Metadata = pageMetadata({ description: site.description, path: "/" });

export default function HomePage() {
  return (
    <NightPage>
      <Hero />
      <Statement />
      <CoachStory />
      <FindYourTraining />
      <MembershipSection />
      <CtaBand />
    </NightPage>
  );
}
