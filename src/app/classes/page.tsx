import type { Metadata } from "next";
import { pageMetadata } from "@/lib/metadata";
import { getService } from "@/content/services";
import { timetable } from "@/content/classes";
import { site } from "@/content/site";
import { isPublishable } from "@/lib/publish";
import { PRIMARY_CTA } from "@/lib/booking";
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
  const booking = PRIMARY_CTA;
  const classes = getService("group-classes");
  const timesPublished = isPublishable(timetable.status);
  const venue = `${site.location.venue}, ${site.location.street}, ${site.location.town}`;

  // Steps only describe what is confirmed. Places are arranged by message.
  const joinSteps = [
    {
      title: "Choose a session",
      body: timesPublished
        ? "Pick the class time that suits you from the timetable above."
        : "Class times are being finalised. Get in touch to hear about current sessions.",
    },
    {
      title: "Get in touch to book",
      body: "Message Alex on Instagram with the session you would like to join. New to kettlebells? Say so in your message.",
    },
    { title: "Come to Media House", body: `Classes take place at ${venue}.` },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Group classes"
        title="Kettlebell classes in Cumbernauld"
        intro={classes.summary}
      >
        <ButtonLink href={booking.href}>{booking.label}</ButtonLink>
        <ButtonLink href="#book" variant="text" className="self-center sm:ml-4">
          How to join
        </ButtonLink>
      </PageHeader>

      <Section id="timetable" labelledBy="timetable-heading">
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

      <Section tone="ink" id="book" labelledBy="join-heading">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <SectionHeading id="join-heading" eyebrow="Joining" title="How to join a class" tone="ink" />
            <ButtonLink href={booking.href} tone="dark" className="mt-8">
              {booking.label}
            </ButtonLink>
          </div>
          <ol className="grid grid-cols-1 gap-8 lg:col-span-7">
            {joinSteps.map((step, i) => (
              <li key={step.title} className="grid grid-cols-[2.5rem_1fr] gap-x-4 border-t border-line-inverse pt-5">
                <span className="eyebrow pt-1 text-muted-inverse" aria-hidden="true">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  <h3 className="text-lg font-bold">{step.title}</h3>
                  <p className="mt-2 text-muted-inverse">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
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
