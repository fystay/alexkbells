import type { Metadata } from "next";
import Image from "next/image";
import { site } from "@/content/site";
import { pageMetadata } from "@/lib/metadata";
import { getService } from "@/content/services";
import { timetable } from "@/content/classes";
import { getBookingAction, getClassBookingAction, getOnlineCoachingAction, type CallToAction } from "@/lib/booking";
import { isPublishable } from "@/lib/publish";
import { shortDay, sortSessions } from "@/lib/schedule";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Section, SectionHeading } from "@/components/ui/Section";
import { Timetable } from "@/components/sections/Timetable";
import { PriceList } from "@/components/sections/PriceList";
import { Location } from "@/components/sections/Location";
import { Faq } from "@/components/sections/Faq";
import { CtaBand } from "@/components/sections/CtaBand";
import { HeroVideo } from "@/components/sections/HeroVideo";
import { KeepHyphens } from "@/components/ui/KeepHyphens";

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
];

function Hero() {
  const booking = getBookingAction("any");
  const online = getOnlineCoachingAction();
  const video = site.heroVideo;
  const photo = video ? null : site.photos.hero;
  const hasMedia = Boolean(video || photo);
  const showTimes = isPublishable(timetable.status);
  const days = sortSessions(timetable.sessions).map((s) => shortDay(s.day));

  const facts = [
    { label: "Where", value: `${site.location.venue}, ${site.location.town}` },
    ...(showTimes ? [{ label: "Classes", value: days.join(" · ") }] : []),
    { label: "Online", value: "Coaching wherever you train" },
  ];

  // Phones: headline and booking button first, then the video edge to edge.
  // Desktop: text beside the video, which is as large as the first view
  // allows (up to its half of the grid) without cropping its 4:5 frame.
  const media =
    "-mx-4 mt-8 sm:mx-0 sm:max-w-xl lg:col-span-6 lg:col-start-7 lg:row-span-4 lg:row-start-1 lg:mt-0 lg:w-[min(100%,calc((100svh-7rem)*0.8),44rem)] lg:max-w-none lg:self-center lg:justify-self-end";

  return (
    <section aria-labelledby="hero-heading" className="bg-paper">
      <div className="container-page pt-6 pb-10 sm:pt-10 lg:pt-4 lg:pb-12">
        <div className={hasMedia ? "grid grid-cols-1 lg:min-h-[calc(100svh-7rem)] lg:grid-cols-12 lg:grid-rows-[1fr_auto_auto_1fr] lg:gap-x-10" : undefined}>
          <div className={hasMedia ? "lg:col-span-6 lg:row-start-2" : undefined}>
            <p className="eyebrow text-muted">Kettlebell coaching · {site.location.town}</p>
            <h1
              id="hero-heading"
              className={`mt-4 font-display text-display text-balance ${hasMedia ? "lg:text-display-split" : ""}`}
            >
              <span className="block">Get stronger.</span>
              <span className="block">Move better.</span>
            </h1>
            <p className="mt-4 max-w-xl text-lede text-muted lg:mt-5">
              Coached kettlebell classes and one-to-one sessions in {site.location.town}, plus online coaching
              wherever you train.
            </p>
          </div>
          <div className={hasMedia ? "mt-6 lg:col-span-6 lg:row-start-3 lg:mt-8" : "mt-7"}>
            <ButtonLink href={booking.href} external={booking.external} className="w-full sm:w-auto">
              {booking.label}
            </ButtonLink>
          </div>
          {video ? <HeroVideo sources={video.sources} poster={video.poster} className={media} /> : null}
          {photo ? (
            <div className={media}>
              <Image
                src={photo.src}
                alt={photo.alt}
                width={photo.width}
                height={photo.height}
                priority
                sizes="(min-width: 1024px) 40vw, 100vw"
                className="aspect-[4/5] w-full object-cover grayscale"
              />
            </div>
          ) : null}
          <div className={hasMedia ? "mt-4 flex flex-wrap gap-x-8 lg:col-span-6 lg:row-start-4 lg:mt-3 lg:self-start" : "mt-3 flex flex-wrap gap-x-8"}>
            <ButtonLink href={online.href} variant="text">
              {online.label}
            </ButtonLink>
            <ButtonLink href="/classes" variant="text">
              Group classes
            </ButtonLink>
          </div>
        </div>

        <dl className={`mt-12 grid grid-cols-1 border-t border-ink ${facts.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
          {facts.map((fact) => (
            <div key={fact.label} className="border-b border-line py-4 sm:border-b-0 sm:pr-6">
              <dt className="eyebrow text-muted">{fact.label}</dt>
              <dd className="mt-1 font-semibold">{fact.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

function Benefits() {
  const booking = getClassBookingAction();
  return (
    <Section tone="surface" labelledBy="benefits-heading">
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <SectionHeading
            id="benefits-heading"
            eyebrow="Why kettlebell coaching"
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

function ClassesPreview() {
  const booking = getClassBookingAction();
  return (
    <Section tone="ink" labelledBy="classes-heading">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <SectionHeading
          id="classes-heading"
          eyebrow="Group classes"
          title="Train in a coached group"
          intro={`Coached group kettlebell sessions at ${site.location.venue}, Cumbernauld. New to kettlebells? Mention it when you ${booking.kind === "booking" ? "book" : "get in touch"}.`}
          tone="ink"
        />
        <ButtonLink href="/classes" variant="text" tone="dark" className="self-start sm:self-auto">
          Class details
        </ButtonLink>
      </div>
      <div className="mt-10">
        <Timetable tone="ink" labelledBy="classes-heading" />
      </div>
      <div className="mt-10">
        <ButtonLink href={booking.href} external={booking.external} tone="dark">
          {booking.label}
        </ButtonLink>
      </div>
    </Section>
  );
}

function About() {
  const photo = site.photos.about;
  return (
    <Section labelledBy="about-heading">
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:items-center">
        <div className="lg:col-span-6">
          <SectionHeading
            id="about-heading"
            eyebrow="About"
            title="Coached by Alex"
            intro={
              <p>
                Alex is a kettlebell coach based in Cumbernauld, running group classes and
                one-to-one sessions at {site.location.venue}, and coaching people further afield
                online.
              </p>
            }
          />
        </div>
        <div className="lg:col-span-5 lg:col-start-8">
          {photo ? (
            <Image
              src={photo.src}
              alt={photo.alt}
              width={photo.width}
              height={photo.height}
              sizes="(min-width: 1024px) 40vw, 100vw"
              className="aspect-[4/5] w-full object-cover grayscale"
            />
          ) : (
            <a
              href={site.social.instagram.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col justify-between gap-16 bg-ink p-8 text-paper transition-colors hover:bg-ink-soft sm:p-10"
            >
              <span className="eyebrow text-muted-inverse">Instagram</span>
              <span>
                <span className="block font-display text-h3 xs:text-h2">{site.social.instagram.handle}</span>
                <span className="mt-3 inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.08em]">
                  See the training
                  <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">
                    →
                  </span>
                </span>
              </span>
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          )}
        </div>
      </div>
    </Section>
  );
}

function CoachingOptions() {
  const options = [getService("one-to-one"), getService("online-coaching")];
  const actions: Record<string, CallToAction> = {
    "one-to-one": getBookingAction("one-to-one"),
    "online-coaching": getOnlineCoachingAction(),
  };
  return (
    <Section tone="ink" labelledBy="options-heading">
      <SectionHeading
        id="options-heading"
        eyebrow="Personal coaching"
        title={<KeepHyphens>Prefer one-to-one or online?</KeepHyphens>}
        intro="Coaching tailored to you, face to face in Cumbernauld or online wherever you train."
        tone="ink"
      />
      <div className="mt-14 grid gap-14 md:grid-cols-2 md:gap-10 lg:gap-16">
        {options.map((service) => (
          <article key={service.id} aria-labelledby={`${service.id}-option`} className="flex flex-col">
            <h3 id={`${service.id}-option`} className="font-display text-h3">
              <KeepHyphens>{service.name}</KeepHyphens>
            </h3>
            <p className="mt-3 mb-8 max-w-md text-muted-inverse">{service.summary}</p>
            <div className="mt-auto">
              <PriceList prices={service.prices} tone="ink" />
              <div className="mt-6 flex flex-col items-start gap-2 xs:flex-row xs:flex-wrap xs:items-center xs:gap-x-8">
                <ButtonLink href={actions[service.id].href} external={actions[service.id].external} tone="dark">
                  {actions[service.id].label}
                </ButtonLink>
                <ButtonLink href={service.href} variant="text" tone="dark">
                  Find out more
                  <span className="sr-only"> about {service.name.toLowerCase()}</span>
                </ButtonLink>
              </div>
            </div>
          </article>
        ))}
      </div>
    </Section>
  );
}

export default function HomePage() {
  return (
    <>
      <Hero />
      <Benefits />
      <ClassesPreview />
      <About />
      <CoachingOptions />
      <Location />
      <Faq />
      <CtaBand />
    </>
  );
}
