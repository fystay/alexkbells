import type { Metadata } from "next";
import { pillars } from "@/content/about";
import { pageMetadata } from "@/lib/metadata";
import { revealDelay } from "@/lib/reveal";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Section, SectionHeading, type SectionTone } from "@/components/ui/Section";
import { CoachStory } from "@/components/home/CoachStory";
import { CoachQuote } from "@/components/sections/CoachQuote";
import { CtaBand } from "@/components/sections/CtaBand";
import { PageHeader } from "@/components/sections/PageHeader";

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
      <PageHeader
        eyebrow="About RAENG"
        title="Strength is built through consistency."
        intro="RAENG is a kettlebell club in Cumbernauld, Glasgow: classes with flexible memberships, plus 1:1 and online coaching, built around good technique and a club that shows up."
      >
        <ButtonLink href="/memberships" variant="secondary" className="w-full sm:w-auto">
          View memberships
        </ButtonLink>
      </PageHeader>

      <CoachQuote tone={tone()} />

      <Section tone={tone()} id="values" labelledBy="values-heading">
        <SectionHeading
          id="values-heading"
          eyebrow="What we stand for"
          title="Strength. Community. Discipline."
          intro="A training space that feels purposeful rather than commercial: focused, uncluttered and built around the people in it."
        />
        <ul className="rule-list mt-8 max-w-2xl">
          {pillars.map((p, i) => (
            <li key={p.title} data-reveal style={revealDelay(i)} className="rule-row">
              <h3 className="font-semibold">{p.title}</h3>
              <p className="mt-0.5">{p.body}</p>
            </li>
          ))}
        </ul>
      </Section>

      <CoachStory showAboutLink={false} tone={tone()} />

      {/* Why kettlebells and the location are on the home page and in the footer: not repeated here (2026-10-26). */}
      <CtaBand body="Come and train with us." tone={tone()} />
    </>
  );
}
