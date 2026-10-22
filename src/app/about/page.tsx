import type { Metadata } from "next";
import { aboutStory, pillars } from "@/content/about";
import { isPublishable } from "@/lib/publish";
import { pageMetadata } from "@/lib/metadata";
import { revealDelay } from "@/lib/reveal";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Section, SectionHeading } from "@/components/ui/Section";
import { CoachStory } from "@/components/home/CoachStory";
import { CtaBand } from "@/components/sections/CtaBand";
import { Location } from "@/components/sections/Location";
import { PageHeader } from "@/components/sections/PageHeader";

export const metadata: Metadata = pageMetadata({
  title: "About RAENG",
  description:
    "RAENG Kettlebell Club is a kettlebell club in Cumbernauld, Glasgow, built on strength, community and discipline. Meet the coach and see how we train.",
  path: "/about",
});

// Hedged: what kettlebell training involves, not what it will do for any one person.
const kettlebell = [
  { title: "Build strength", body: "Swings, squats and presses work the whole body." },
  { title: "Get fitter", body: "Train strength and conditioning in the same session." },
  { title: "Move well", body: "Learn the key lifts with a coach on your technique." },
  { title: "Train anywhere", body: "One kettlebell. At home, in the gym or away." },
];

export default function AboutPage() {
  const story = aboutStory && isPublishable(aboutStory.status) ? aboutStory : null;

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

      {story ? (
        <Section id="story" labelledBy="story-heading">
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

      <Section id="values" labelledBy="values-heading">
        <SectionHeading
          id="values-heading"
          eyebrow="What we stand for"
          title="Strength. Community. Discipline."
          intro="A training space that feels purposeful rather than commercial: focused, uncluttered and built around the people in it."
        />
        <ol className="mt-12 grid grid-cols-1 gap-10 md:grid-cols-3">
          {pillars.map((p, i) => (
            <li key={p.title} data-reveal style={revealDelay(i)} className="border-t border-grey pt-4">
              <p className="eyebrow " aria-hidden="true">
                {String(i + 1).padStart(2, "0")}
              </p>
              <h3 className="mt-3 font-display text-h2">{p.title}</h3>
              <p className="mt-3 ">{p.body}</p>
            </li>
          ))}
        </ol>
      </Section>

      <CoachStory />

      <Section id="kettlebells" labelledBy="kettlebells-heading">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-5">
            <SectionHeading
              id="kettlebells-heading"
              eyebrow="Why kettlebells"
              title="One simple tool. A lot of training."
              intro="The kettlebell rewards good technique and honest effort. It trains strength and conditioning together, and it scales from a first session to years of progression."
            />
          </div>
          <ul className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:col-span-7">
            {kettlebell.map((b, i) => (
              <li key={b.title} data-reveal style={revealDelay(i)} className="border-t border-grey pt-4">
                <h3 className="font-display text-h3">{b.title}</h3>
                <p className="mt-2 ">{b.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </Section>

      <Location />
      <CtaBand body="Come and train with us." />
    </>
  );
}
