import type { Metadata } from "next";
import { site } from "@/content/site";
import { pageMetadata } from "@/lib/metadata";
import { CoachIntro } from "@/components/home/CoachIntro";
import { Community } from "@/components/home/Community";
import { FindYourTraining } from "@/components/home/FindYourTraining";
import { Hero } from "@/components/home/Hero";
import { Philosophy } from "@/components/home/Philosophy";
import { CtaBand } from "@/components/sections/CtaBand";

export const metadata: Metadata = pageMetadata({ description: site.description, path: "/" });

export default function HomePage() {
  return (
    <>
      <Hero />
      <Philosophy />
      <FindYourTraining />
      <Community />
      <CoachIntro />
      <CtaBand />
    </>
  );
}
