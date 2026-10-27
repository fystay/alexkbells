import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata } from "@/lib/metadata";
import { getService } from "@/content/services";
import { images } from "@/content/images";
import { getPrimaryCtaFor } from "@/lib/booking";
import { InstagramAlternative } from "@/components/ui/InstagramAlternative";
import { StartTraining } from "@/components/ui/StartTraining";
import { Section, SectionHeading } from "@/components/ui/Section";
import { Steps } from "@/components/ui/Steps";
import { Explainer } from "@/components/ui/Explainer";
import { oneToOneFocusScenes, oneToOneHowScenes } from "@/components/coaching/CoachingScenes";
import { PageHeader } from "@/components/sections/PageHeader";
import { PriceList } from "@/components/sections/PriceList";
import { CtaBand } from "@/components/sections/CtaBand";

export const metadata: Metadata = pageMetadata({
  title: "1:1 Kettlebell Coaching",
  description:
    "Face-to-face 1:1 kettlebell coaching in Cumbernauld, Glasgow, tailored to your goals, experience and development.",
  path: "/coaching",
});

// What individual coaching gives you. Descriptions of the approach, not promises of results.
const focus = [
  { title: "Strength", body: "Build it progressively, with loads that suit you today and a plan for what comes next." },
  { title: "Technique", body: "A coach watching every rep, with feedback you can use straight away." },
  { title: "Movement", body: "Move well first. Better movement makes harder training safer and more effective." },
];

export default function CoachingPage() {
  const service = getService("one-to-one");
  const booking = getPrimaryCtaFor("one-to-one");
  const open = booking.kind === "booking";

  const steps = [
    {
      title: open ? "Send a booking request" : "Message Alex",
      body: open
        ? "Tell Alex the days and times that suit you and a little about your training."
        : "Message Alex on Instagram with what you want from your training and when you're free.",
    },
    { title: "Alex confirms your session", body: "Alex replies to arrange a time that works." },
    { title: "Train face to face", body: "Sessions take place at Media House in Cumbernauld, built around you." },
  ];

  return (
    <>
      <PageHeader
        image={images.oneToOne}
        eyebrow="1:1 Coaching"
        title="Coaching built around you."
        intro="Face-to-face kettlebell coaching with Alex, tailored to your goals, your experience and how you want to develop."
      >
        <StartTraining
          href={booking.href}
          label={booking.label}
          srSuffix=" (1:1 coaching)"
          external={booking.external}
         
          className="w-full sm:w-[22rem]"
        />
      </PageHeader>

      <Section tone="white" id="who-for" labelledBy="who-heading">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-5">
            <SectionHeading
              id="who-heading"
              eyebrow="Who it's for"
              title="Attention that stays on you"
              intro="1:1 coaching suits anyone who wants training shaped around them as an individual, rather than a session built for a group."
            />
          </div>
          <div className="lg:col-span-7">
            {/* Tap through the three: the words are also here as a list for screen readers. */}
            <Explainer steps={focus} scenes={oneToOneFocusScenes} autoPlay={false} noun="point" />
            <ul className="bullets sr-only">
              {focus.map((f) => (
                <li key={f.title}>
                  <h3 className="font-semibold">{f.title}</h3>
                  <p className="mt-0.5">{f.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      <Section id="how-it-works" labelledBy="how-heading">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-5">
            <SectionHeading
              id="how-heading"
              eyebrow="How it works"
              title="From first message to first session"
             
            />
            {/* The page opens and ends with Book now; the steps don't repeat it (2026-10-26). */}
            {open ? <InstagramAlternative className="mt-4" /> : null}
          </div>
          <div className="lg:col-span-7">
            <Explainer steps={steps} scenes={oneToOneHowScenes} noun="step" />
            <Steps steps={steps} className="sr-only" />
          </div>
        </div>
      </Section>

      <Section tone="white" id="pricing" labelledBy="pricing-heading">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-5">
            <SectionHeading id="pricing-heading" eyebrow="Pricing" title="Sessions and monthly coaching" />
          </div>
          <div className="lg:col-span-6 lg:col-start-7">
            <PriceList prices={service.prices} />
            <p className="mt-6 ">
              Prefer to train in a group?{" "}
              <Link href="/classes" className="font-semibold  underline underline-offset-4 hover:no-underline">
                See group classes
              </Link>
              . Further from Cumbernauld?{" "}
              <Link href="/online-coaching" className="font-semibold  underline underline-offset-4 hover:no-underline">
                See online coaching
              </Link>
              .
            </p>
          </div>
        </div>
      </Section>

      {/* No location section or price line here: the steps say where, the prices are just above, and the footer has the address (2026-10-26). */}
      <CtaBand title="Ready to train 1:1?" body={null} service="one-to-one" />
    </>
  );
}
