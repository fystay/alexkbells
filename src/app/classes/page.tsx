import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata } from "@/lib/metadata";
import { timetable, groupClass } from "@/content/classes";
import { faqAnswer } from "@/content/faq";
import { images } from "@/content/images";
import { site } from "@/content/site";
import { isPublishable } from "@/lib/publish";
import { getPrimaryCtaFor } from "@/lib/booking";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { StartTraining } from "@/components/ui/StartTraining";
import { Section, SectionHeading } from "@/components/ui/Section";
import { Steps } from "@/components/ui/Steps";
import { PageHeader } from "@/components/sections/PageHeader";
import { ClassTimes } from "@/components/home/ClassTimes";
import { Location } from "@/components/sections/Location";
import { CtaBand } from "@/components/sections/CtaBand";
import { InstagramAlternative } from "@/components/ui/InstagramAlternative";

// Read at build time like every booking setting: the request form when it's open, else a message.
const bookingOpen = getPrimaryCtaFor("group-class").kind === "booking";

export const metadata: Metadata = pageMetadata({
  title: "Group Kettlebell Classes",
  description: bookingOpen
    ? "Group kettlebell classes at Media House, Cumbernauld. See the class times and price, and request your place online."
    : "Group kettlebell classes at Media House, Cumbernauld. Book now to join a session.",
  path: "/classes",
});

export default function ClassesPage() {
  const booking = getPrimaryCtaFor("group-class");
  const timesPublished = isPublishable(timetable.status);
  const venue = `${site.location.venue}, ${site.location.street}, ${site.location.town}`;

  // Steps only describe what is confirmed. With the booking form open, step 2
  // is a request (Alex still confirms each place); otherwise a message.
  const open = booking.kind === "booking";
  const joinSteps = [
    {
      title: "Choose a session",
      body: timesPublished
        ? "Pick the class time that suits you from the timetable above."
        : "Class times are being finalised. Send a message to hear about current sessions.",
    },
    open
      ? {
          title: "Send a booking request",
          body: "Pick the class date you'd like and send your request in a minute. New to kettlebells? Choose Beginner.",
        }
      : {
          title: "Message Alex to book",
          body: "Message Alex on Instagram with the session you would like to join. New to kettlebells? Say so in your message.",
        },
    open
      ? { title: "Alex confirms your place", body: `Then you come along to ${venue}.` }
      : { title: "Come to Media House", body: `Classes take place at ${venue}.` },
  ];

  // Everything below is Alex's class listing or the confirmed FAQ answers.
  const involves = [
    { title: "The sessions", body: groupClass.description },
    { title: "Who they're for", body: "All experience levels. Exercises are scaled to your ability." },
    { title: "Your first session", body: faqAnswer("first-session") },
    { title: "What to bring", body: faqAnswer("bring") },
  ];

  return (
    <>
      <PageHeader
        image={images.classes}
        eyebrow="Classes"
        title="Group kettlebell training"
        intro="Coached sessions that build strength, conditioning and movement quality, at Media House in Cumbernauld."
      >
        <StartTraining href={booking.href} label={booking.label} external={booking.external} className="w-full sm:w-[22rem]" />
        <ButtonLink href="#join" variant="text" className="self-center sm:ml-4">
          How to join
        </ButtonLink>
      </PageHeader>

      {/* Second pass (2026-10-26): the times first, then what a class is like,
          how to join and where. The price is said once (in the timetable), and the
          FAQ is gone: every answer it gave is already on this page. */}
      <Section id="timetable" labelledBy="timetable-heading">
        <SectionHeading id="timetable-heading" title="Class times" />
        {/* The home page's timetable (the home page is the reference). */}
        <ClassTimes className="mt-6 max-w-2xl" />
        <p className="mt-4 max-w-2xl text-sm">
          {groupClass.payment}{" "}
          <Link href="/memberships" className="font-semibold underline underline-offset-4 hover:no-underline">
            Save with a membership
          </Link>
        </p>
      </Section>

      <Section tone="white" id="what-to-expect" labelledBy="expect-heading">
        <SectionHeading id="expect-heading" title="What to expect" />
        <dl className="mt-8 grid grid-cols-1 gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
          {involves.map((item) => (
            <div key={item.title} data-reveal className="border-t border-grey pt-4">
              <dt className="font-display text-h3">{item.title}</dt>
              <dd className="mt-3">{item.body}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section id="join" labelledBy="join-heading">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-5">
            <SectionHeading id="join-heading" title="How to join a class" />
            {open ? <InstagramAlternative className="mt-4" /> : null}
          </div>
          <Steps steps={joinSteps} className="lg:col-span-7" />
        </div>
      </Section>

      <Location />
      <CtaBand body="Prefer personal coaching? Train face to face or online." tone="plain" />
    </>
  );
}
