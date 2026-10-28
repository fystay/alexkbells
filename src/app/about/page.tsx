import type { Metadata } from "next";
import { pillars } from "@/content/about";
import { images } from "@/content/images";
import { pageMetadata } from "@/lib/metadata";
import { revealDelay } from "@/lib/reveal";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Section, SectionHeading, type SectionTone } from "@/components/ui/Section";
import { CoachStory } from "@/components/home/CoachStory";
import { CoachQuote } from "@/components/sections/CoachQuote";
import { CtaBand } from "@/components/sections/CtaBand";
import { Philosophy } from "@/components/sections/Philosophy";
import { CompoundChart } from "@/components/sections/CompoundChart";

export const metadata: Metadata = pageMetadata({
  title: "About RAENG",
  description:
    "RAENG Fitness is a kettlebell club in Cumbernauld, Glasgow, built on strength, community and discipline. Meet the coach and see how we train.",
  path: "/about",
});

export default function AboutPage() {
  // Sections alternate white / cream below the cream opening, as on the home page,
  // whether or not the quote is shown.
  let n = 0;
  const tone = (): SectionTone => (n++ % 2 === 0 ? "white" : "plain");

  return (
    <>
      {/* Opens with RAENG's philosophy card, word for word (owner, 2026-10-27). */}
      <Philosophy>
        <ButtonLink href="/memberships" variant="secondary" className="w-full sm:w-auto">
          View memberships
        </ButtonLink>
      </Philosophy>

      <CoachQuote tone={tone()} />

      <Section tone={tone()} id="values" labelledBy="values-heading">
        <SectionHeading
          id="values-heading"
          title="What we stand for."
        />
        {/* Owner's /about design (2026-10-28): the value beside its line from 420 px, between thin rules. */}
        <ul className="mt-8 max-w-2xl border-t border-line">
          {pillars.map((p, i) => (
            <li
              key={p.title}
              data-reveal
              style={revealDelay(i)}
              className="grid grid-cols-1 gap-1 border-b border-line py-5 min-[421px]:grid-cols-[7.5rem_1fr] min-[421px]:gap-4 motion-safe:transition-[padding] motion-safe:duration-300 lg:hover:pl-2.5"
            >
              <h3 className="font-bold">{p.title}</h3>
              <p className="min-w-0">{p.body}</p>
            </li>
          ))}
        </ul>
      </Section>

      <CoachStory showAboutLink={false} showPhotos={false} portrait={images.coach} tone={tone()}>
        <CompoundChart className="mt-6" />
      </CoachStory>

      {/* Why kettlebells and the location are on the home page and in the footer: not repeated here (2026-10-26). */}
      <CtaBand body="Come and train with us." tone={tone()} />
    </>
  );
}
