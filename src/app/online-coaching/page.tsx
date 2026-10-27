import type { Metadata } from "next";
import { pageMetadata } from "@/lib/metadata";
import { getService } from "@/content/services";
import { site } from "@/content/site";
import { getOnlineCoachingAction } from "@/lib/booking";
import { StartTraining } from "@/components/ui/StartTraining";
import { Section, SectionHeading } from "@/components/ui/Section";
import { Steps } from "@/components/ui/Steps";
import { Explainer } from "@/components/ui/Explainer";
import { onlineHowScenes } from "@/components/coaching/CoachingScenes";
import { PageHeader } from "@/components/sections/PageHeader";
import { PhotoFrame } from "@/components/ui/PhotoFrame";
import { images } from "@/content/images";
import { PriceList } from "@/components/sections/PriceList";
import { CtaBand } from "@/components/sections/CtaBand";
import { revealDelay } from "@/lib/reveal";
import { publishable } from "@/lib/publish";
import { formatGbp } from "@/lib/schedule";

export const metadata: Metadata = pageMetadata({
  title: "Online Kettlebell Coaching",
  description:
    "Online coaching with RAENG: personalised kettlebell programming, ongoing support and progression, wherever you train.",
  path: "/online-coaching",
});

export default function OnlineCoachingPage() {
  const service = getService("online-coaching");
  const enquiry = getOnlineCoachingAction();
  // One published price (content/services.ts), shown as the pricing heading.
  const prices = publishable(service.prices);
  const price = prices.length === 1 ? prices[0] : null;

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
        // The owner's video-call image (2026-10-27), 4:5 at every width so the logo and the call both show.
        panel={<PhotoFrame photo={images.onlineCoaching} sizes="(min-width: 1248px) 480px, (min-width: 1024px) 38vw, 100vw" priority className="aspect-[4/5] w-full" />}
        eyebrow="Online coaching"
        title="Coaching that goes where you train."
        intro="Personalised kettlebell programming with ongoing support and progression, wherever you are. For people outside Cumbernauld, or anyone who wants coaching beyond the studio."
      >
        <StartTraining href={enquiry.href} label={enquiry.label} external={enquiry.external} className="w-full sm:w-[22rem]" />
        <p className="w-full text-sm ">
          This is an enquiry, not a sign-up: nothing is booked and there&apos;s nothing to pay.
        </p>
      </PageHeader>

      {/* No decorative panel and no cards (2026-10-26): rows between thin lines (2026-10-27). */}
      <Section tone="white" id="included" labelledBy="included-heading">
        <div className="lg:grid lg:grid-cols-12 lg:gap-x-14">
          <SectionHeading id="included-heading" className="lg:col-span-5" eyebrow="What you get" title="Structure, support and progress" />
          <ul className="lined mt-8 lg:col-span-7 lg:mt-0">
            {included.map((item, i) => (
              <li key={item.title} data-reveal style={revealDelay(i)} >
                <h3 className="font-semibold">{item.title}</h3>
                <p className="mt-0.5">{item.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </Section>

      <Section id="how-it-works" labelledBy="how-heading">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-5">
            <SectionHeading id="how-heading" eyebrow="How it works" title="Start with a conversation" />
          </div>
          <div className="lg:col-span-7">
            <Explainer steps={steps} scenes={onlineHowScenes} autoPlay={false} noun="step" />
            <Steps steps={steps} className="sr-only" />
          </div>
        </div>
      </Section>

      {/* Tidied (owner, 2026-10-27): one price, so the price is the heading ("£79 per month."),
          not "Simple monthly coaching" over a "Monthly … per month" row; then one way to enquire. */}
      <Section tone="white" id="pricing" labelledBy="pricing-heading">
        {price ? (
          <div className="lg:grid lg:grid-cols-12 lg:items-end lg:gap-x-14">
            <SectionHeading id="pricing-heading" className="lg:col-span-7" eyebrow="Pricing" title={`${formatGbp(price.amountGbp)} ${price.unit}`} />
            <div className="mt-6 lg:col-span-5 lg:mt-0 lg:text-right">
              <a
                href={enquiry.href}
                {...(enquiry.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                className="inline-flex min-h-11 items-center font-semibold underline underline-offset-4 hover:no-underline"
              >
                {enquiry.label}
                {enquiry.external ? <span className="sr-only"> (opens in a new tab)</span> : null}
              </a>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-5">
              <SectionHeading id="pricing-heading" eyebrow="Pricing" title="Monthly coaching" />
            </div>
            <div className="lg:col-span-6 lg:col-start-7">
              <PriceList prices={service.prices} />
            </div>
          </div>
        )}
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
