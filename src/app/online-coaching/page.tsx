import type { Metadata } from "next";
import { pageMetadata } from "@/lib/metadata";
import { getService } from "@/content/services";
import { site } from "@/content/site";
import { getOnlineCoachingAction } from "@/lib/booking";
import { StartTraining } from "@/components/ui/StartTraining";
import { Section, SectionHeading } from "@/components/ui/Section";
import { MonthRing, Reach, featureIcons, stepIcons } from "@/components/coaching/OnlineGraphics";
import { LineRows, RailSteps } from "@/components/ui/LineRows";
import { PageHeader } from "@/components/sections/PageHeader";
import { PhotoFrame } from "@/components/ui/PhotoFrame";
import { images } from "@/content/images";
import { PriceList } from "@/components/sections/PriceList";
import { CtaBand } from "@/components/sections/CtaBand";
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
  // Wording from the owner's design (2026-10-28).
  const included = [
    { title: "Personalised programming", body: "Training written for you, not a template handed to everyone." },
    { title: "Ongoing support", body: "Help that carries on as you train, so you never have to work it out alone." },
    { title: "Progression", body: "A plan that moves forward as you do." },
  ];

  const steps = [
    { title: "Tell Alex about you", body: "Your goal, your experience and how to reach you, in a few quick questions." },
    { title: "Alex reviews it personally", body: "Every enquiry is read and answered by Alex himself." },
    { title: "Decide together", body: "If online coaching is a good fit, Alex explains how it works and what happens next." },
  ];

  const enquire = (className: string) => (
    <StartTraining href={enquiry.href} label={enquiry.label} external={enquiry.external} className={className} />
  );

  // The owner's design (2026-10-28): the studio-to-you line drawing under the
  // intro; what you get and how it works as rows with line drawings; the price
  // in one outlined box with a month ring; then the in-person band.
  return (
    <>
      <PageHeader
        // The owner's video-call image (2026-10-27), 4:5 at every width so the logo and the call both show.
        panel={<PhotoFrame photo={images.onlineCoaching} sizes="(min-width: 1248px) 480px, (min-width: 1024px) 38vw, 100vw" priority className="aspect-[4/5] w-full" />}
        eyebrow="Online coaching"
        title="Coaching that goes where you train."
        intro={
          <>
            <p>
              Personalised kettlebell programming, with ongoing support and progression, wherever you are. For people outside Cumbernauld, or anyone who wants coaching
              beyond the studio.
            </p>
            <Reach className="mt-6 max-w-xl" />
          </>
        }
      >
        {enquire("w-full sm:w-[22rem]")}
        <p className="w-full text-sm">This is an enquiry, not a sign-up. Nothing is booked and there&apos;s nothing to pay.</p>
      </PageHeader>

      <Section tone="white" id="included" labelledBy="included-heading">
        <div className="lg:grid lg:grid-cols-12 lg:gap-x-14">
          <SectionHeading id="included-heading" className="lg:col-span-5" eyebrow="What you get" title="Structure, support and progress." />
          <LineRows items={included.map((item, i) => ({ ...item, icon: featureIcons[i] }))} className="mt-8 lg:col-span-7 lg:mt-0" />
        </div>
      </Section>

      <Section id="how-it-works" labelledBy="how-heading">
        <div className="lg:grid lg:grid-cols-12 lg:gap-x-14">
          <SectionHeading id="how-heading" className="lg:col-span-5" eyebrow="How it works" title="Start with a conversation." />
          <RailSteps items={steps.map((step, i) => ({ ...step, icon: stepIcons[i] }))} className="mt-8 lg:col-span-7 lg:mt-0" />
        </div>
      </Section>

      {/* One price (owner's design, 2026-10-28): "One monthly price." over an outlined box with the
          price and a month ring, then Enquire. Several prices fall back to the price list. */}
      <Section tone="white" id="pricing" labelledBy="pricing-heading">
        <div className="lg:grid lg:grid-cols-12 lg:gap-x-14">
          <SectionHeading id="pricing-heading" className="lg:col-span-5" eyebrow="Pricing" title={price ? "One monthly price." : "Monthly coaching."} />
          <div className="mt-8 lg:col-span-7 lg:mt-0">
            {price ? (
              <>
                <div data-reveal className="grid grid-cols-1 items-center gap-5 rounded-[1.375rem] border-[1.5px] border-ink px-5 py-6 min-[361px]:grid-cols-[auto_1fr] sm:gap-6 sm:px-7">
                  <MonthRing className="size-24" />
                  <div className="min-w-0">
                    <p className="font-display text-[clamp(2.75rem,12vw,4rem)] leading-none font-bold tracking-tight tabular-nums">
                      {formatGbp(price.amountGbp)}
                      <span className="ml-1.5 align-baseline text-[0.32em] font-semibold tracking-normal">{price.unit}</span>
                    </p>
                    <p className="mt-2">Online kettlebell coaching with Alex.</p>
                  </div>
                </div>
                {enquire("mt-6 w-full sm:w-[22rem]")}
              </>
            ) : (
              <PriceList prices={service.prices} />
            )}
          </div>
        </div>
      </Section>

      <CtaBand
        title="Rather train in person?"
        body={`Book a group class or a 1:1 session in ${site.location.town}.`}
        service="any"
        tone="plain"
      />
    </>
  );
}
