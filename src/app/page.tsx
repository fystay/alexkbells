import type { Metadata } from "next";
import { SitePage } from "@/components/ui/SitePage";
import { site } from "@/content/site";
import { pageMetadata } from "@/lib/metadata";
import { CoachStory } from "@/components/home/CoachStory";
import { FindYourTraining } from "@/components/home/FindYourTraining";
import { Hero } from "@/components/home/Hero";
import { Statement } from "@/components/home/Statement";
import { CtaBand } from "@/components/sections/CtaBand";
import { MembershipSummary } from "@/components/memberships/MembershipSummary";

export const metadata: Metadata = pageMetadata({ description: site.description, path: "/" });

export default function HomePage() {
  return (
    <SitePage>
      <Hero />
      <Statement />
      <CoachStory />
      <FindYourTraining />
      <MembershipSummary />
      <CtaBand />
    </SitePage>
  );
}
