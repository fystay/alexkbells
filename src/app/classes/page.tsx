import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata } from "@/lib/metadata";
import { groupClass, onlineClassBooking } from "@/content/classes";
import { onlineJoinEnabled } from "@/lib/membership-checkout";
import { images } from "@/content/images";
import { getPrimaryCtaFor } from "@/lib/booking";
import { Section, SectionHeading } from "@/components/ui/Section";
import { ClassesHero } from "@/components/classes/ClassesHero";
import { JoinSteps } from "@/components/home/JoinSteps";
import { firstClassSteps } from "@/content/home";
import { InstagramAlternative } from "@/components/ui/InstagramAlternative";

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
 * The class page in the home page's style (2026-10-26: no cards, nothing said
 * twice): what the classes are and Alex's photo, then the home page's three
 * steps (times, booking, where, the first session and what to bring) with how
 * to pay, then Book now. The steps hold everything the old timetable, "What
 * to expect", "How to join" and location sections said.
 */
export default function ClassesPage() {
  const booking = getPrimaryCtaFor("group-class");
  const open = booking.kind === "booking";

  return (
    <>
      <ClassesHero
        photo={images.classes}
        title="Group kettlebell training."
        eyebrow="Classes in Cumbernauld"
        cta={{ href: booking.href, label: booking.label, external: booking.external }}
        moreHref="#join"
        moreLabel="How to join"
      />
      <Section spacing="compact" className="pb-0 sm:pb-0">
        <p className="max-w-2xl text-lede">Coached sessions that build strength, conditioning and movement quality, at Media House in Cumbernauld.</p>
      </Section>

      <Section id="join" labelledBy="join-heading">
        <div className="lg:grid lg:grid-cols-12 lg:gap-x-14">
          <div className="lg:col-span-5">
            <SectionHeading id="join-heading" title={firstClassSteps.title} />
            {open ? <InstagramAlternative className="mt-4" /> : null}
          </div>
          {/* The home page's steps (the home page is the reference). */}
          <JoinSteps
            className="mt-8 lg:col-span-7 lg:mt-0"
            paymentNote={
              <>
                {onlineJoinEnabled() ? onlineClassBooking.payment : groupClass.payment}{" "}
                <Link href="/memberships" className="font-semibold underline underline-offset-4 hover:no-underline">
                  Save with a membership
                </Link>
              </>
            }
          />
        </div>
      </Section>

      {/* The steps end with Book now, so no closing band repeating it: one line to the other ways to train. */}
      <Section spacing="compact" className="pt-0 sm:pt-0">
        <p className="max-w-2xl">
          Prefer personal coaching?{" "}
          <Link href="/coaching" className="font-semibold underline underline-offset-4 hover:no-underline">
            1:1 coaching
          </Link>{" "}
          or{" "}
          <Link href="/online-coaching" className="font-semibold underline underline-offset-4 hover:no-underline">
            online coaching
          </Link>
          .
        </p>
      </Section>
    </>
  );
}
