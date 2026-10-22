import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata } from "@/lib/metadata";
import { getService } from "@/content/services";
import { getPrimaryCtaFor } from "@/lib/booking";
import { InstagramAlternative } from "@/components/ui/InstagramAlternative";
import { StartTraining } from "@/components/ui/StartTraining";
import { Section, SectionHeading } from "@/components/ui/Section";
import { Steps } from "@/components/ui/Steps";
import { PageHeader } from "@/components/sections/PageHeader";
import { PriceList } from "@/components/sections/PriceList";
import { Location } from "@/components/sections/Location";
import { CtaBand } from "@/components/sections/CtaBand";
import { revealDelay } from "@/lib/reveal";

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
      title: open ? "Send a booking request" : "Get in touch",
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
        eyebrow="1:1 Coaching"
        title="Coaching built around you"
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

      <Section id="who-for" labelledBy="who-heading">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-5">
            <SectionHeading
              id="who-heading"
              eyebrow="Who it's for"
              title="Attention that stays on you"
              intro="1:1 coaching suits anyone who wants training shaped around them as an individual, rather than a session built for a group."
            />
          </div>
          <ul className="grid grid-cols-1 gap-8 sm:grid-cols-3 lg:col-span-7">
            {focus.map((f, i) => (
              <li key={f.title} data-reveal style={revealDelay(i)} className="border-t border-grey pt-4">
                <h3 className="font-display text-h3">{f.title}</h3>
                <p className="mt-3 ">{f.body}</p>
              </li>
            ))}
          </ul>
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
            <StartTraining
              href={booking.href}
              label={booking.label}
              srSuffix=" (1:1 coaching)"
              external={booking.external}
             
              className="mt-8 w-full sm:w-[22rem]"
            />
            {open ? <InstagramAlternative className="mt-4" /> : null}
          </div>
          <Steps steps={steps} className="lg:col-span-7" />
        </div>
      </Section>

      <Section id="pricing" labelledBy="pricing-heading">
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

      <Location />
      <CtaBand />
    </>
  );
}
