import type { Metadata } from "next";
import Link from "next/link";
import { pageMetadata } from "@/lib/metadata";
import { groupClass, onlineClassBooking } from "@/content/classes";
import { onlineJoinEnabled } from "@/lib/membership-checkout";
import { images } from "@/content/images";
import { getPrimaryCtaFor } from "@/lib/booking";
import { Section, SectionHeading } from "@/components/ui/Section";
import { ClassesHero } from "@/components/classes/ClassesHero";
import { ClassFocus } from "@/components/classes/ClassFocus";
import { ClassPicker, classesTitle } from "@/components/home/ClassPicker";
import { firstClassSteps } from "@/content/home";
import { faq } from "@/content/faq";
import { isPublishable } from "@/lib/publish";
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

/** A first-class line, shown only while the FAQ answer it restates is confirmed. */
function confirmed(id: "first-session" | "bring", text: string): string | null {
  const item = faq.find((f) => f.id === id);
  return item && isPublishable(item.status) ? text : null;
}

/**
 * The class page in the home page's style: what the classes are, then the
 * home page's class times (owner, 2026-10-28: the same section, `ClassPicker`,
 * with the week, the next class, where and Book now), then the first session,
 * what to bring and how to pay as rows between thin lines.
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
        moreHref="#times"
        moreLabel="Class times"
      />
      <ClassFocus />

      <Section id="times" labelledBy="classes-heading">
        <div className="lg:grid lg:grid-cols-12 lg:gap-x-14">
          <div className="lg:col-span-5">
            <SectionHeading id="classes-heading" eyebrow="Classes" title={classesTitle()} />
            {open ? <InstagramAlternative className="mt-4" /> : null}
          </div>
          <div className="mt-8 lg:col-span-7 lg:mt-0">
            {/* The home page's classes section (the home page is the reference). */}
            <ClassPicker membershipsHref="/memberships" />
            <h3 className="eyebrow mt-12">Your first class</h3>
            <ul className="lined mt-3 text-[0.9375rem] leading-relaxed sm:text-base">
              {[confirmed("first-session", firstClassSteps.firstSession), confirmed("bring", firstClassSteps.bring), onlineJoinEnabled() ? onlineClassBooking.payment : groupClass.payment]
                .filter((line): line is string => Boolean(line))
                .map((line) => (
                  <li key={line}>{line}</li>
                ))}
            </ul>
          </div>
        </div>
      </Section>

      {/* The class times end with Book now, so no closing band repeating it: one line to the other ways to train. */}
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
