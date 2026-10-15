import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { site } from "@/content/site";
import { pageMetadata } from "@/lib/metadata";
import { getService, services } from "@/content/services";
import { timetable } from "@/content/classes";
import { getClassBookingAction } from "@/lib/booking";
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

const benefits = [
  {
    title: "One bell, the whole body",
    body: "Swings, squats, presses and carries work through the whole body, and a single kettlebell is enough to train them.",
  },
  {
    title: "Strength and conditioning together",
    body: "Kettlebell training can build strength and work capacity in the same session, without a room full of equipment.",
  },
  {
    title: "Starts where you are",
    body: "Bells come in a wide range of weights, so training can begin at your level and progress gradually.",
  },
  {
    title: "Coaching makes the difference",
    body: "Kettlebell movements reward good technique. Having a coach watch and correct you helps you learn them well.",
  },
];

function Hero() {
  const booking = getClassBookingAction();
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

  return (
    <section aria-labelledby="hero-heading" className="bg-paper">
      <div className="container-page pt-12 pb-10 sm:pt-20 lg:pt-24">
        <div className={hasMedia ? "grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-center lg:gap-12" : undefined}>
          <div className={hasMedia ? "lg:col-span-7" : undefined}>
            <p className="eyebrow text-muted">
              {site.descriptor} · {site.location.town}
            </p>
            {/* Beside media, the headline steps down on wide screens so it fits 7 columns. */}
            <h1
              id="hero-heading"
              className={`mt-5 font-display text-display ${hasMedia ? "lg:text-h1" : ""}`}
            >
              Kettlebell
              <br />
              coaching in
              <br />
              Cumbernauld
            </h1>
            <p className="mt-8 max-w-xl text-lede text-muted">
              Group classes, one-to-one coaching tailored to you, and online coaching with
              personalised programming, support and progression.
            </p>
            <div className="mt-10 flex flex-col gap-3 xs:flex-row">
              <ButtonLink href={booking.href} external={booking.external}>
                {booking.label}
              </ButtonLink>
              <ButtonLink href="/coaching" variant="secondary">
                Explore coaching
              </ButtonLink>
            </div>
          </div>
          {video ? (
            <HeroVideo
              sources={video.sources}
              poster={video.poster}
              className="w-full max-w-md lg:col-span-5 lg:max-w-none"
            />
          ) : null}
          {photo ? (
            <div className="lg:col-span-5">
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
        </div>

        <dl className={`mt-16 grid grid-cols-1 border-t border-ink ${facts.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
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

function ClassesPreview() {
  const booking = getClassBookingAction();
  return (
    <Section tone="ink" labelledBy="classes-heading">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <SectionHeading id="classes-heading" eyebrow="Group classes" title="Class times" tone="ink" />
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

function Services() {
  return (
    <Section labelledBy="services-heading">
      <SectionHeading
        id="services-heading"
        eyebrow="Coaching"
        title="Three ways to train"
        intro="Train in a group, one-to-one, or online on your own schedule."
      />
      <ol className="mt-14 grid gap-10 md:grid-cols-3 md:gap-8">
        {services.map((service, i) => (
          <li key={service.id} className="flex flex-col border-t-2 border-ink pt-6">
            <span className="eyebrow text-muted" aria-hidden="true">
              {String(i + 1).padStart(2, "0")}
            </span>
            <h3 className="mt-6 font-display text-h3">
              <KeepHyphens>{service.name}</KeepHyphens>
            </h3>
            <p className="mt-3 flex-1 text-muted">{service.summary}</p>
            <Link
              href={service.href}
              className="mt-6 inline-flex min-h-11 items-center gap-2 self-start text-sm font-semibold uppercase tracking-[0.08em] underline-offset-[6px] hover:underline"
            >
              Find out more
              <span className="sr-only"> about {service.name.toLowerCase()}</span>
              <span aria-hidden="true">→</span>
            </Link>
          </li>
        ))}
      </ol>
    </Section>
  );
}

function WhyKettlebells() {
  return (
    <Section tone="surface" labelledBy="why-heading">
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <SectionHeading
            id="why-heading"
            eyebrow="Why kettlebells"
            title="A simple tool that goes a long way"
          />
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
  return (
    <Section tone="ink" labelledBy="options-heading">
      <SectionHeading
        id="options-heading"
        eyebrow="Personal coaching"
        title="Coaching options"
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
              <ButtonLink href={service.href} variant="text" tone="dark" className="mt-4">
                Find out more
                <span className="sr-only"> about {service.name.toLowerCase()}</span>
              </ButtonLink>
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
      <ClassesPreview />
      <Services />
      <WhyKettlebells />
      <About />
      <CoachingOptions />
      <Location />
      <Faq />
      <CtaBand />
    </>
  );
}
