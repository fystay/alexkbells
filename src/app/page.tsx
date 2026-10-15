import type { Metadata } from "next";
import Image from "next/image";
import { site } from "@/content/site";
import { pageMetadata } from "@/lib/metadata";
import { getBookingAction, getClassBookingAction, getOnlineCoachingAction } from "@/lib/booking";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Section, SectionHeading } from "@/components/ui/Section";
import { HowToBook } from "@/components/sections/HowToBook";
import { Faq } from "@/components/sections/Faq";
import { CtaBand } from "@/components/sections/CtaBand";
import { HeroVideo } from "@/components/sections/HeroVideo";
import { Journey } from "@/components/sections/Journey";
import { WaysToTrain } from "@/components/sections/WaysToTrain";
import { MobileBookBar } from "@/components/sections/MobileBookBar";

export const metadata: Metadata = pageMetadata({ description: site.description, path: "/" });

// Benefits are hedged ("can") and make no promises about specific results.
const benefits = [
  {
    title: "Build strength",
    body: "Swings, squats, presses and carries work the whole body, and one kettlebell is enough to train them.",
  },
  {
    title: "Improve your fitness",
    body: "Kettlebell sessions can train strength and conditioning together, so you get fitter as you get stronger.",
  },
  {
    title: "Train with confidence",
    body: "Learn the key kettlebell movements properly, with a coach watching your technique and helping you progress.",
  },
  {
    title: "Stay consistent",
    body: "Regular group classes give your week structure, and training alongside others can help you keep showing up.",
  },
  {
    title: "Efficient, full-body sessions",
    body: "Swings, cleans and presses work many muscles at once, so a focused session goes a long way.",
  },
  {
    title: "Train anywhere",
    body: "A kettlebell takes up little space, so what you learn works at home, in the gym or away.",
  },
];

function Hero() {
  const booking = getBookingAction("any");
  const online = getOnlineCoachingAction();
  const video = site.heroVideo;
  const intro = `Classes and one-to-one sessions at ${site.location.venue}, or online coaching anywhere.`;

  // Phones (<640px): headline and booking button, then the video edge to edge
  // (it breaks out of the page gutters) at its full 4:5 frame, never cropped.
  // Tablets: headline, button and the whole video fill the first screen; the
  // video takes the height left (container query units keep its 4:5 frame).
  // The intro line and secondary links follow below on both.
  // Desktop: text beside the video, which is as large as the first view
  // allows (up to its half of the grid) without cropping.
  return (
    <section aria-labelledby="hero-heading" className="bg-paper">
      <div className="container-page pt-4 pb-10 sm:pt-8 lg:pt-4 lg:pb-8">
        <div className="lg:grid lg:min-h-[calc(100svh-7rem)] lg:grid-cols-12 lg:grid-rows-[1fr_auto_auto_1fr] lg:gap-x-10">
          <div className="flex flex-col sm:h-[calc(100svh-9rem)] sm:max-h-[64rem] sm:min-h-[30rem] lg:contents">
            <div className="lg:col-span-6 lg:row-start-2">
              <p className="eyebrow text-muted">Kettlebell coaching · {site.location.town}</p>
              <h1 id="hero-heading" className="mt-3 font-display text-display text-balance sm:mt-4 lg:text-display-split">
                <span className="block">Get stronger.</span>
                <span className="block">Move better.</span>
              </h1>
              <p className="mt-5 hidden max-w-md text-lede text-muted lg:block">{intro}</p>
            </div>
            <div className="mt-4 sm:mt-5 lg:col-span-6 lg:row-start-3 lg:mt-8">
              <ButtonLink href={booking.href} external={booking.external} className="w-full sm:w-auto">
                {booking.label}
              </ButtonLink>
            </div>
            {video ? (
              <div className="-mx-4 mt-4 sm:mx-0 sm:mt-5 sm:min-h-0 sm:flex-1 sm:[container-type:size] lg:col-span-6 lg:col-start-7 lg:row-span-4 lg:row-start-1 lg:mt-0 lg:flex lg:items-center lg:justify-end lg:[container-type:normal]">
                <HeroVideo
                  sources={video.sources}
                  poster={video.poster}
                  className="w-full sm:w-[min(100cqw,80cqh)] lg:w-[min(100%,calc((100svh-7rem)*0.8),44rem)]"
                />
              </div>
            ) : null}
          </div>
          <p className="mt-6 max-w-md text-lede text-muted lg:hidden">{intro}</p>
          <div className="mt-3 flex flex-wrap gap-x-8 lg:col-span-6 lg:row-start-4 lg:mt-3 lg:self-start">
            <ButtonLink href={online.href} variant="text">
              {online.label}
            </ButtonLink>
            <ButtonLink href="/classes" variant="text">
              Group classes
            </ButtonLink>
          </div>
        </div>
      </div>
    </section>
  );
}

function Benefits() {
  const booking = getClassBookingAction();
  return (
    <Section tone="surface" id="why-kettlebells" labelledBy="benefits-heading">
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <SectionHeading
            id="benefits-heading"
            eyebrow="Why kettlebells"
            title="Stronger, fitter, more confident"
            intro="Kettlebells are a simple tool that trains the whole body. Good coaching helps you get the most from them."
          />
          <ButtonLink href={booking.href} external={booking.external} className="mt-8">
            {booking.label}
          </ButtonLink>
        </div>
        <ul className="grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2 lg:col-span-7">
          {benefits.map((b) => (
            <li key={b.title} className="border-t border-ink pt-5">
              <h3 className="text-lg font-bold">{b.title}</h3>
              <p className="mt-2 text-muted">{b.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </Section>
  );
}


function About() {
  const stills = site.trainingStills;
  const { instagram } = site.social;
  return (
    <Section id="about" labelledBy="about-heading">
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:items-center lg:gap-16">
        <div className="lg:col-span-5">
          <SectionHeading
            id="about-heading"
            eyebrow="About Alex"
            title="Coached by Alex"
            intro={
              <p>
                Alex Robertson is a kettlebell coach based in Cumbernauld, running group classes and
                one-to-one sessions at {site.location.venue}, and coaching people further afield
                online.
              </p>
            }
          />
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
            <ButtonLink href={instagram.url} external variant="secondary">
              Follow {instagram.handle}
            </ButtonLink>
            <p className="text-sm text-muted">
              <span className="font-display text-h3 text-ink">{instagram.followers}</span> followers on Instagram
            </p>
          </div>
        </div>
        {stills.length > 0 ? (
          <ul className="grid grid-cols-3 gap-2 sm:gap-4 lg:col-span-7" aria-label="From the training">
            {stills.map((photo, i) => (
              <li key={photo.src} className={i === 1 ? "lg:mt-16" : i === 2 ? "lg:mt-8" : undefined}>
                <Image
                  src={photo.src}
                  alt={photo.alt}
                  width={photo.width}
                  height={photo.height}
                  sizes="(min-width: 1024px) 18vw, 33vw"
                  className="aspect-[4/5] w-full object-cover"
                />
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </Section>
  );
}


export default function HomePage() {
  const booking = getBookingAction("any");
  return (
    <>
      <Hero />
      {/* Order answers Alex's four questions: what he offers, why kettlebells, who he is, where and how to book. */}
      <WaysToTrain />
      <Benefits />
      <About />
      <Journey />
      <HowToBook />
      <Faq />
      <CtaBand />
      {booking.kind === "booking" ? (
        <MobileBookBar
          href={booking.href}
          label={booking.label}
          external={booking.external}
          hideWhenVisible={["section[aria-labelledby=hero-heading]", "#how-to-book", "section[aria-labelledby=cta-heading]", "footer"]}
        />
      ) : null}
    </>
  );
}
