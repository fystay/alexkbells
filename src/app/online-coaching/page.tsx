import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata } from "@/lib/metadata";
import { getService } from "@/content/services";
import { site } from "@/content/site";
import { getOnlineCoachingAction } from "@/lib/booking";
import { StartTraining } from "@/components/ui/StartTraining";
import { Section, SectionHeading } from "@/components/ui/Section";
import { Steps } from "@/components/ui/Steps";
import { PageHeader } from "@/components/sections/PageHeader";
import { PriceList } from "@/components/sections/PriceList";
import { CtaBand } from "@/components/sections/CtaBand";
import { revealDelay } from "@/lib/reveal";

export const metadata: Metadata = pageMetadata({
  title: "Online Kettlebell Coaching",
  description:
    "Online coaching with RAENG: personalised kettlebell programming, ongoing support and progression, wherever you train.",
  path: "/online-coaching",
});

export default function OnlineCoachingPage() {
  const service = getService("online-coaching");
  const enquiry = getOnlineCoachingAction();

  // Only what is confirmed about the service (content/services.ts). Further
  // features (reviews, check-ins, platform) are added there once Alex confirms them.
  const included = [
    { title: "Personalised programming", body: "Training written for you, not a template handed to everyone." },
    { title: "Ongoing support", body: "Support that continues as you train, so you're never left to work it out alone." },
    { title: "Progression", body: "A plan that moves forward as you do." },
  ];

  const steps = [
    { title: "Tell Alex about you", body: "Your goal, your experience and how to reach you, in a few quick questions." },
    { title: "Alex reviews it personally", body: "Every enquiry is read and answered by Alex." },
    { title: "Decide together", body: "If online coaching is a good fit, Alex explains how it works and the next steps." },
  ];

  return (
    <>
      <PageHeader
        panel={
          // No photo for online coaching yet: the same typographic panel as its card on the home page.
          <div aria-hidden="true" className="flex aspect-[4/3] w-full flex-col justify-end rounded-3xl bg-ink p-6 text-white lg:aspect-[4/5] lg:p-8">
            <span className="font-display text-[clamp(2.25rem,1.4rem+2.2vw,3.25rem)] leading-[0.9]">
              Train
              <span className="block">anywhere</span>
            </span>
          </div>
        }
        eyebrow="Online coaching"
        title="Coaching that goes where you train."
        intro="Personalised kettlebell programming with ongoing support and progression, wherever you are. For people outside Cumbernauld, or anyone who wants coaching beyond the studio."
      >
        <StartTraining href={enquiry.href} label={enquiry.label} external={enquiry.external} className="w-full sm:w-[22rem]" />
        <p className="w-full text-sm ">
          This is an enquiry, not a sign-up: nothing is booked and there&apos;s nothing to pay.
        </p>
      </PageHeader>

      <Section tone="white" id="included" labelledBy="included-heading">
        <SectionHeading id="included-heading" eyebrow="What you get" title="Structure, support and progress" />
        <ul className="mt-10 grid grid-cols-1 gap-3 md:grid-cols-3">
          {included.map((item, i) => (
            <li key={item.title} data-reveal style={revealDelay(i)} className="card px-5 py-5 sm:px-6">
              <p className="eyebrow " aria-hidden="true">
                {String(i + 1).padStart(2, "0")}
              </p>
              <h3 className="mt-2 text-h3 font-semibold">{item.title}</h3>
              <p className="mt-3 ">{item.body}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="how-it-works" labelledBy="how-heading">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-5">
            <SectionHeading id="how-heading" eyebrow="How it works" title="Start with a conversation" />
          </div>
          <Steps steps={steps} className="lg:col-span-7" />
        </div>
      </Section>

      <Section tone="white" id="pricing" labelledBy="pricing-heading">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-5">
            <SectionHeading id="pricing-heading" eyebrow="Pricing" title="Simple monthly coaching" />
          </div>
          <div className="lg:col-span-6 lg:col-start-7">
            <PriceList prices={service.prices} />
            <p className="mt-6 ">
              Prefer to train in person?{" "}
              <Link href="/coaching" className="font-semibold  underline underline-offset-4 hover:no-underline">
                See 1:1 coaching
              </Link>{" "}
              or{" "}
              <Link href="/classes" className="font-semibold  underline underline-offset-4 hover:no-underline">
                group classes
              </Link>
              .
            </p>
          </div>
        </div>
      </Section>

      <CtaBand
        title="Rather train in person?"
        body={`Book a group class or a 1:1 session at ${site.location.venue}, ${site.location.town}.`}
        service="any"
        tone="plain"
      />
    </>
  );
}
