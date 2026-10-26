import type { Metadata } from "next";
import { aboutStory, pillars } from "@/content/about";
import { images } from "@/content/images";
import { isPublishable } from "@/lib/publish";
import { pageMetadata } from "@/lib/metadata";
import { revealDelay } from "@/lib/reveal";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Section, SectionHeading, type SectionTone } from "@/components/ui/Section";
import { CoachStory } from "@/components/home/CoachStory";
import { WhyKettlebells } from "@/components/home/WhyKettlebells";
import { CtaBand } from "@/components/sections/CtaBand";
import { Location } from "@/components/sections/Location";
import { PageHeader } from "@/components/sections/PageHeader";

export const metadata: Metadata = pageMetadata({
  title: "About RAENG",
  description:
    "RAENG Fitness is a kettlebell club in Cumbernauld, Glasgow, built on strength, community and discipline. Meet the coach and see how we train.",
  path: "/about",
});

export default function AboutPage() {
  const story = aboutStory && isPublishable(aboutStory.status) ? aboutStory : null;
  // Sections alternate white / cream below the cream opening, as on the home page,
  // whether or not the (optional) story is shown.
  let n = 0;
  const tone = (): SectionTone => (n++ % 2 === 0 ? "white" : "plain");

  return (
    <>
      <PageHeader
        image={images.hero}
        eyebrow="About RAENG"
        title="Strength is built through consistency."
        intro="RAENG is a kettlebell club in Cumbernauld, Glasgow: classes with flexible memberships, plus 1:1 and online coaching, built around good technique and a club that shows up."
      >
        <ButtonLink href="/memberships" variant="secondary" className="w-full sm:w-auto">
          View memberships
        </ButtonLink>
      </PageHeader>

      {story ? (
        <Section tone={tone()} id="story" labelledBy="story-heading">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <SectionHeading id="story-heading" eyebrow="Our story" title={story.title} />
            </div>
            <div className="max-w-2xl space-y-5 text-lede  lg:col-span-7">
              {story.paragraphs.map((text) => (
                <p key={text}>{text}</p>
              ))}
            </div>
          </div>
        </Section>
      ) : null}

      <Section tone={tone()} id="values" labelledBy="values-heading">
        <SectionHeading
          id="values-heading"
          eyebrow="What we stand for"
          title="Strength. Community. Discipline."
          intro="A training space that feels purposeful rather than commercial: focused, uncluttered and built around the people in it."
        />
        <ul className="mt-10 grid grid-cols-1 gap-3 md:grid-cols-3">
          {pillars.map((p, i) => (
            <li key={p.title} data-reveal style={revealDelay(i)} className="card px-5 py-5 sm:px-6">
              <h3 className="card-title">{p.title}</h3>
              <p className="mt-1.5">{p.body}</p>
            </li>
          ))}
        </ul>
      </Section>

      <CoachStory showAboutLink={false} tone={tone()} />

      {/* The home page is the reference (owner, 2026-10-23): the same section, word for word. */}
      <WhyKettlebells tone={tone()} />

      <Location tone={tone()} />
      <CtaBand body="Come and train with us." tone={tone()} />
    </>
  );
}
