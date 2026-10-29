import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata } from "@/lib/metadata";
import { onlineJoinEnabled } from "@/lib/membership-checkout";
import { PlanList, PlanTerms } from "@/components/memberships/PlanList";
import { Faq } from "@/components/sections/Faq";
import { ClassPicker, classesTitle } from "@/components/home/ClassPicker";
import { CancellationPolicy } from "@/components/memberships/CancellationPolicy";
import { images } from "@/content/images";
import { getPrimaryCtaFor } from "@/lib/booking";
import { Section, SectionHeading } from "@/components/ui/Section";
import { ClassesHero } from "@/components/classes/ClassesHero";
import { ClassFocus } from "@/components/classes/ClassFocus";
import { StartTraining } from "@/components/ui/StartTraining";

// Read at build time like every booking setting: the request form when it's open, else a message.
const bookingOpen = getPrimaryCtaFor("group-class").kind === "booking";

export const metadata: Metadata = pageMetadata({
  title: "Group Kettlebell Classes",
  description: bookingOpen
    ? onlineJoinEnabled()
      ? "Group kettlebell classes at Media House, Cumbernauld. See the class times and price, and book and pay online."
      : "Group kettlebell classes at Media House, Cumbernauld. See the class times and price, and request your place online."
    : "Group kettlebell classes at Media House, Cumbernauld. Book now to join a session.",
  path: "/classes",
});

/**
 * The classes page: the class film and Book now; what the classes build (three
 * line drawings); the timetable and studio location (the home page's class
 * rows); Book now and one line to the other ways to train; the memberships
 * (the home page's); the booking and cancellation policy; the class questions.
 * The "Start in three steps" section was removed at the owner's request
 * (2026-10-29).
 */
export default function ClassesPage() {
  const booking = getPrimaryCtaFor("group-class");

  return (
    <>
      <ClassesHero
        photo={images.classes}
        title="Group kettlebell training."
        eyebrow="Classes in Cumbernauld"
        cta={{
          href: booking.href,
          // Alex's wording for the hero button (the owner, 2026-10-29), as on the home page.
          label: booking.kind === "booking" ? "Book a class" : booking.label,
          external: booking.external,
        }}
      />
      <ClassFocus />

      {/* Alex's layout (2026-10-29): the full timetable and the studio location, the home page's class rows. */}
      <Section id="timetable" labelledBy="timetable-heading">
        <div className="lg:grid lg:grid-cols-12 lg:gap-x-14">
          <SectionHeading id="timetable-heading" className="lg:col-span-5" eyebrow="Timetable" title={classesTitle()} />
          <ClassPicker className="mt-8 lg:col-span-7 lg:mt-0" />
        </div>
      </Section>

      <Section
        spacing="compact"
        labelledBy="book-heading"
        className="pt-0 sm:pt-0"
      >
        <h2 id="book-heading" className="sr-only">
          Book
        </h2>
        <div className="border-t border-line pt-8 lg:ml-[calc(41.666%+1.4rem)]">
          <StartTraining
            href={booking.href}
            label={booking.label}
            external={booking.external}
            className="w-full sm:w-auto sm:px-10"
          />
          <p className="mt-5">
            Prefer personal coaching? Try{" "}
            <Link
              href="/coaching"
              className="font-semibold underline underline-offset-4 hover:no-underline"
            >
              1:1 coaching
            </Link>{" "}
            or{" "}
            <Link
              href="/coaching#small-group"
              className="font-semibold underline underline-offset-4 hover:no-underline"
            >
              small group coaching
            </Link>
            .
          </p>
        </div>
      </Section>

      <Section id="memberships" labelledBy="memberships-heading">
        <div className="lg:grid lg:grid-cols-12 lg:gap-x-14">
          <SectionHeading id="memberships-heading" className="lg:col-span-5" title="Memberships." />
          <div className="mt-8 lg:col-span-7 lg:mt-0">
            <PlanList />
            <PlanTerms className="mt-8" />
          </div>
        </div>
      </Section>

      {/* Alex's layout (2026-10-29): Booking and cancellation policies, then the class questions. */}
      <CancellationPolicy title="Booking and cancellation policy" />

      <Faq tone="plain" ids={["when", "where", "length", "beginners", "first-session", "bring"]} />
    </>
  );
}
