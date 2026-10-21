import type { Metadata } from "next";
import { aboutStory, pillars } from "@/content/about";
import { coach } from "@/content/coach";
import { images } from "@/content/images";
import { site } from "@/content/site";
import { isPublishable } from "@/lib/publish";
import { pageMetadata } from "@/lib/metadata";
import { revealDelay } from "@/lib/reveal";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { PhotoFrame } from "@/components/ui/PhotoFrame";
import { Section, SectionHeading } from "@/components/ui/Section";
import { coachDetails } from "@/components/home/CoachIntro";
import { CtaBand } from "@/components/sections/CtaBand";
import { Journey } from "@/components/sections/Journey";
import { Location } from "@/components/sections/Location";
import { PageHeader } from "@/components/sections/PageHeader";

export const metadata: Metadata = pageMetadata({
  title: "About RAENG",
  description:
    "RAENG is a strength-training and coaching practice in Cumbernauld, Glasgow, built on strength, community and discipline. Meet the coach and see how we train.",
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
  const { instagram, facebook } = site.social;
  const story = aboutStory && isPublishable(aboutStory.status) ? aboutStory : null;
  const details = coachDetails();

  return (
    <>
      <PageHeader
        image={images.community}
        eyebrow="About RAENG"
        title="Strength is built through consistency."
        intro="RAENG is a strength-training and coaching practice in Cumbernauld, Glasgow: kettlebell classes, 1:1 coaching and online coaching, built around good technique and a community that shows up."
      >
        <ButtonLink href="/classes" tone="dark" variant="secondary" className="w-full sm:w-auto">
          Explore training
        </ButtonLink>
      </PageHeader>

      {story ? (
        <Section tone="surface" id="story" labelledBy="story-heading">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <SectionHeading id="story-heading" eyebrow="Our story" title={story.title} />
            </div>
            <div className="max-w-2xl space-y-5 text-lede text-muted lg:col-span-7">
              {story.paragraphs.map((text) => (
                <p key={text}>{text}</p>
              ))}
            </div>
          </div>
        </Section>
      ) : null}

      <Section tone="paper" id="values" labelledBy="values-heading">
        <SectionHeading
          id="values-heading"
          eyebrow="What we stand for"
          title="Strength. Community. Discipline."
          intro="A training space that feels purposeful rather than commercial: focused, uncluttered and built around the people in it."
        />
        <ol className="mt-12 grid grid-cols-1 gap-10 md:grid-cols-3">
          {pillars.map((p, i) => (
            <li key={p.title} data-reveal style={revealDelay(i)} className="border-t border-ink pt-4">
              <p className="eyebrow text-muted" aria-hidden="true">
                {String(i + 1).padStart(2, "0")}
              </p>
              <h3 className="mt-3 font-display text-h2">{p.title}</h3>
              <p className="mt-3 text-muted">{p.body}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section tone="ink" id="kettlebells" labelledBy="kettlebells-heading">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:items-center lg:gap-16">
          <PhotoFrame photo={images.equipment} sizes="(min-width: 1024px) 40vw, 100vw" className="aspect-[4/3] w-full lg:col-span-5 lg:aspect-[4/5]" />
          <div className="lg:col-span-7">
            <SectionHeading
              id="kettlebells-heading"
              eyebrow="Why kettlebells"
              title="One simple tool. A lot of training."
              intro="The kettlebell rewards good technique and honest effort. It trains strength and conditioning together, and it scales from a first session to years of progression."
              tone="ink"
            />
            <ul className="mt-10 grid grid-cols-1 gap-x-8 gap-y-8 sm:grid-cols-2">
              {kettlebell.map((b, i) => (
                <li key={b.title} data-reveal style={revealDelay(i)} className="border-t border-line-inverse pt-4">
                  <h3 className="font-display text-h3">{b.title}</h3>
                  <p className="mt-2 text-muted-inverse">{b.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      <Section tone="paper" id="coach" labelledBy="coach-heading">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:items-center lg:gap-16">
          <PhotoFrame photo={images.coach} sizes="(min-width: 1024px) 36vw, 100vw" className="aspect-[4/5] w-full max-w-md lg:col-span-5 lg:max-w-none" />
          <div className="lg:col-span-7">
            <SectionHeading
              id="coach-heading"
              eyebrow="Your coach"
              title={coach.name}
              intro={coach.summary}
            />
            {details.length > 0 ? (
              <dl className="mt-8 max-w-xl space-y-6 border-t border-line pt-6">
                {details.map((d) => (
                  <div key={d.label}>
                    <dt className="eyebrow">{d.label}</dt>
                    {d.paragraphs.map((text) => (
                      <dd key={text} className="mt-2">
                        {text}
                      </dd>
                    ))}
                  </div>
                ))}
              </dl>
            ) : null}
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
              <ButtonLink href={instagram.url} external variant="secondary">
                Follow {instagram.handle}
              </ButtonLink>
              <p className="text-sm text-muted">
                <span className="font-display text-h3 text-ink">{instagram.followers}</span> followers on Instagram
              </p>
              <a
                href={facebook.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center text-sm font-semibold underline underline-offset-4 hover:no-underline"
              >
                Also on Facebook<span className="sr-only"> ({facebook.name}, opens in a new tab)</span>
              </a>
            </div>
          </div>
        </div>
      </Section>

      <Journey />
      <Location />
      <CtaBand body="Come and train with us." />
    </>
  );
}
