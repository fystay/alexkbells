import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata } from "@/lib/metadata";
import { getService } from "@/content/services";
import { smallGroupCoaching } from "@/content/smallGroup";
import { images } from "@/content/images";
import { getPrimaryCtaFor } from "@/lib/booking";
import { InstagramAlternative } from "@/components/ui/InstagramAlternative";
import { StartTraining } from "@/components/ui/StartTraining";
import { Section, SectionHeading } from "@/components/ui/Section";
import { LineRows, RailSteps } from "@/components/ui/LineRows";
import { Duo, focusIcons, howIcons } from "@/components/coaching/OneToOneGraphics";
import { mapsUrl, site } from "@/content/site";
import { publishable } from "@/lib/publish";
import { formatGbp } from "@/lib/schedule";
import { revealDelay } from "@/lib/reveal";
import { PageHeader } from "@/components/sections/PageHeader";
import { FocusFrame } from "@/components/sections/CoachingGraphics";
import { PriceList } from "@/components/sections/PriceList";
import { CtaBand } from "@/components/sections/CtaBand";

export const metadata: Metadata = pageMetadata({
  title: "Kettlebell Coaching",
  description:
    "Face-to-face 1:1 kettlebell coaching and small group coaching in Cumbernauld, Glasgow, tailored to your goals, experience and development.",
  path: "/coaching",
});

// What individual coaching gives you. Descriptions of the approach, not promises of results.
// Wording from the owner's design (2026-10-28).
const focus = [
  { title: "Strength", body: "Loads that suit you today, and a plan for what comes next." },
  { title: "Technique", body: "Every rep watched, with feedback you can use straight away." },
  { title: "Movement", body: "Better movement first, so harder training is safer and works better." },
];

const linkClass = "font-semibold underline underline-offset-4 hover:no-underline";

/**
 * 1:1 coaching, the owner's design (2026-10-28): the coach photo and "you and
 * Alex, one line" under the intro; who it's for and how it works as rows and
 * steps with line drawings; the two prices as boxes (the bundle dark, with
 * its per-session figure); then the closing band.
 */
export default function CoachingPage() {
  const service = getService("one-to-one");
  const booking = getPrimaryCtaFor("one-to-one");
  const open = booking.kind === "booking";
  const prices = publishable(service.prices);
  const l = site.location;

  const steps = [
    {
      title: open ? "Send a booking request" : "Message Alex",
      body: open
        ? "Tell Alex which days and times suit you, and a little about your training."
        : "Message Alex on Instagram with what you want from your training and when you're free.",
    },
    { title: "Alex confirms your session", body: "He replies to arrange a time that works." },
    {
      title: "Train face to face",
      body: (
        <>
          Sessions are at {l.venue}, {l.street}, {l.town}, {l.postcode}.{" "}
          <a href={mapsUrl()} target="_blank" rel="noopener noreferrer" className={`inline-flex min-h-11 items-center ${linkClass}`}>
            Directions<span className="sr-only"> to {l.venue} (opens in a new tab)</span>
          </a>
        </>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        panel={<FocusFrame photo={images.coachHeader} />}
        eyebrow="1:1 Coaching"
        title="Coaching built around you."
        intro={
          <>
            <p>Face-to-face kettlebell coaching with Alex, shaped around your goals, your experience and how you progress.</p>
            <Duo className="mt-6 max-w-xl" />
          </>
        }
      >
        <StartTraining href={booking.href} label={booking.label} srSuffix=" (1:1 coaching)" external={booking.external} className="w-full sm:w-[22rem]" />
      </PageHeader>

      <Section tone="white" id="who-for" labelledBy="who-heading">
        <div className="lg:grid lg:grid-cols-12 lg:gap-x-14">
          <SectionHeading
            id="who-heading"
            className="lg:col-span-5"
            eyebrow="Who it's for"
            title="Attention that stays on you."
            intro="For people who want training designed around them, not a group session."
          />
          <LineRows items={focus.map((f, i) => ({ ...f, icon: focusIcons[i] }))} className="mt-8 lg:col-span-7 lg:mt-0" />
        </div>
      </Section>

      {/* Alex's layout (2026-10-29): "What's included", from the confirmed points. */}
      <Section id="included" labelledBy="included-heading">
        <div className="lg:grid lg:grid-cols-12 lg:gap-x-14">
          <SectionHeading id="included-heading" className="lg:col-span-5" eyebrow="1:1 coaching" title="What's included." />
          <ul className="lined mt-8 lg:col-span-7 lg:mt-0">
            {service.points.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>
      </Section>

      <Section id="how-it-works" labelledBy="how-heading">
        <div className="lg:grid lg:grid-cols-12 lg:gap-x-14">
          <SectionHeading id="how-heading" className="lg:col-span-5" eyebrow="How it works" title="From first message to first session." />
          <div className="mt-8 lg:col-span-7 lg:mt-0">
            <RailSteps items={steps.map((step, i) => ({ ...step, icon: howIcons[i] }))} />
            {/* The page opens and ends with Book now; the steps don't repeat it (2026-10-26). */}
            {open ? <InstagramAlternative className="mt-6" /> : null}
          </div>
        </div>
      </Section>

      <Section tone="white" id="pricing" labelledBy="pricing-heading">
        <div className="lg:grid lg:grid-cols-12 lg:gap-x-14">
          <SectionHeading id="pricing-heading" className="lg:col-span-5" eyebrow="Pricing" title="Sessions and monthly coaching." />
          <div className="mt-8 lg:col-span-7 lg:mt-0">
            {prices.length > 0 && prices.every((p) => p.sessions) ? (
              // Boxes (owner's design): the bundle in ink, dots for its sessions.
              <ul className="grid grid-cols-1 gap-3 min-[361px]:grid-cols-2">
                {prices.map((p, i) => {
                  const bundle = (p.sessions ?? 1) > 1;
                  const note = bundle ? `${p.unit}, ${formatGbp(p.amountGbp / (p.sessions ?? 1))} a session` : `${p.prefix ? `${p.prefix.toLowerCase()}, ` : ""}${p.unit}`;
                  return (
                    <li
                      key={p.label}
                      data-reveal
                      style={revealDelay(i)}
                      className={`flex min-w-0 flex-col gap-2 rounded-[1.375rem] border-[1.5px] border-ink px-[1.125rem] py-[1.375rem] ${bundle ? "bg-ink text-paper" : ""}`}
                    >
                      <h3 className="text-[0.8125rem] font-semibold tracking-[0.12em] uppercase">{p.label}</h3>
                      <p className="font-display text-[clamp(2rem,9vw,2.75rem)] leading-none font-bold tracking-tight tabular-nums">{formatGbp(p.amountGbp)}</p>
                      <p>{note}</p>
                      <span aria-hidden="true" className="mt-1.5 flex gap-1.5">
                        {Array.from({ length: p.sessions ?? 1 }, (_, n) => (
                          <i key={n} className="size-2.5 rounded-full border-[1.5px] border-current bg-current" />
                        ))}
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <PriceList prices={service.prices} />
            )}
            <p className="mt-6 flex flex-wrap gap-x-5">
              <Link href="/classes" className={`inline-flex min-h-11 items-center ${linkClass}`}>
                See group classes
              </Link>
            </p>
          </div>
        </div>
      </Section>

      <Section id="small-group" labelledBy="small-group-heading">
        <SectionHeading id="small-group-heading" className="max-w-xl" eyebrow="Also" title={`${smallGroupCoaching.name}.`} intro={smallGroupCoaching.summary} />
        <p className="mt-6">
          <Link href={smallGroupCoaching.href} className={`inline-flex min-h-11 items-center ${linkClass}`}>
            {smallGroupCoaching.askLabel}
          </Link>
        </p>
      </Section>

      {/* No location section or price line here: the steps say where, the prices are just above, and the footer has the address (2026-10-26). */}
      <CtaBand title="Ready to train 1:1?" body={null} service="one-to-one" />
    </>
  );
}
