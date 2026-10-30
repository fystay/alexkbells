import type { Metadata } from "next";
import { pillars } from "@/content/about";
import { images } from "@/content/images";
import { pageMetadata } from "@/lib/metadata";
import { revealDelay } from "@/lib/reveal";
import { Section, SectionHeading, type SectionTone } from "@/components/ui/Section";
import { CoachStory } from "@/components/home/CoachStory";
import { CtaBand } from "@/components/sections/CtaBand";
import { PageHeader } from "@/components/sections/PageHeader";
import { Philosophy } from "@/components/sections/Philosophy";

export const metadata: Metadata = pageMetadata({
  title: "About RAENG",
  description:
    "RAENG Fitness is a kettlebell club in Cumbernauld, Glasgow, built on strength, community and discipline. Meet the coach and see how we train.",
  path: "/about",
});

/**
 * About, in the order of Alex's layout (2026-10-29): his story, then RAENG's
 * values and long-term vision (the philosophy card and what we stand for).
 * "Coaching approach" has no text from Alex yet, so it is not on the page.
 * No quote band or class facts here.
 */
export default function AboutPage() {
  let n = 0;
  const tone = (): SectionTone => (n++ % 2 === 0 ? "white" : "plain");

  return (
    <div className="section-rules">
      <PageHeader eyebrow="About" title="About RAENG." />

      <CoachStory showAboutLink={false} showPhotos={false} portrait={images.coach} tone={tone()} eyebrow="Alex's story" />

      <Philosophy asSection />

      <Section tone={tone()} id="values" labelledBy="values-heading">
        <SectionHeading id="values-heading" title="What we stand for." />
        {/* Owner's /about design (2026-10-28): the value beside its line from 420 px, as white cards. */}
        <ul className="mt-8 flex max-w-2xl flex-col gap-3">
          {pillars.map((p, i) => (
            <li
              key={p.title}
              data-reveal
              style={revealDelay(i)}
              className="grid grid-cols-1 gap-1 rounded-[1.25rem] bg-white px-5 py-5 min-[421px]:grid-cols-[7.5rem_1fr] min-[421px]:gap-4"
            >
              <h3 className="font-bold">{p.title}</h3>
              <p className="min-w-0">{p.body}</p>
            </li>
          ))}
        </ul>
      </Section>

      <CtaBand body="Come and train with us." tone={tone()} />
    </div>
  );
}
