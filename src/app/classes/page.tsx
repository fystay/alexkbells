import type { Metadata } from "next";
import { pageMetadata } from "@/lib/metadata";
import { getService } from "@/content/services";
import { getClassBookingAction } from "@/lib/booking";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Section, SectionHeading } from "@/components/ui/Section";
import { PageHeader } from "@/components/sections/PageHeader";
import { Timetable } from "@/components/sections/Timetable";
import { PriceList } from "@/components/sections/PriceList";
import { Location } from "@/components/sections/Location";
import { CtaBand } from "@/components/sections/CtaBand";

export const metadata: Metadata = pageMetadata({
  title: "Group Kettlebell Classes",
  description:
    "Group kettlebell classes at Media House, Cumbernauld. Get in touch to join a session.",
  path: "/classes",
});

export default function ClassesPage() {
  const booking = getClassBookingAction();
  const classes = getService("group-classes");

  return (
    <>
      <PageHeader
        eyebrow="Group classes"
        title="Kettlebell classes in Cumbernauld"
        intro={classes.summary}
      >
        <ButtonLink href={booking.href} external={booking.external}>
          {booking.label}
        </ButtonLink>
      </PageHeader>

      <Section labelledBy="timetable-heading">
        <SectionHeading id="timetable-heading" eyebrow="Timetable" title="Class times" />
        <div className="mt-10">
          <Timetable labelledBy="timetable-heading" />
        </div>
        {classes.prices.length > 0 ? (
          <div className="mt-12 max-w-md">
            <PriceList prices={classes.prices} />
          </div>
        ) : null}
      </Section>

      <Section tone="ink" labelledBy="joining-heading">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <SectionHeading id="joining-heading" eyebrow="Joining" title="Coming to a class" tone="ink" />
          </div>
          <div className="space-y-6 text-lede text-muted-inverse lg:col-span-7">
            {booking.kind === "booking" ? (
              <p>Book your place online using the button below.</p>
            ) : (
              <p>
                Get in touch before your first class. Send a message to say which session you
                would like to come to and Alex can let you know everything you need.
              </p>
            )}
            <p>New to kettlebells? Mention it when you get in touch.</p>
            <div className="pt-2">
              <ButtonLink href={booking.href} external={booking.external} tone="dark">
                {booking.label}
              </ButtonLink>
            </div>
          </div>
        </div>
      </Section>

      <Location />
      <CtaBand
        title="Prefer personal coaching?"
        body="Personal coaching is available face to face in Cumbernauld or online."
      />
    </>
  );
}
