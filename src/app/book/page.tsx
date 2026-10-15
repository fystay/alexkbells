import type { Metadata } from "next";
import { pageMetadata } from "@/lib/metadata";
import { formatAddressLines, mapsUrl, site } from "@/content/site";
import { timetable } from "@/content/classes";
import { isPublishable } from "@/lib/publish";
import { formatTime, sortSessions } from "@/lib/schedule";
import { getClassBookingAction } from "@/lib/booking";
import { isBookingFormEnabled } from "@/lib/booking-request";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Section } from "@/components/ui/Section";
import { PageHeader } from "@/components/sections/PageHeader";
import { BookingForm } from "@/components/sections/BookingForm";

export const metadata: Metadata = pageMetadata({
  title: "Book a Class",
  description:
    "Request a place in a group kettlebell class at Media House, Cumbernauld. Alex will reply to confirm your place.",
  path: "/book",
});

const steps = [
  { title: "Send your request", body: "Choose a class and tell us a little about your experience." },
  { title: "Alex confirms your place", body: "You'll get a reply by email to confirm and answer any questions." },
  { title: "Come to your class", body: `Classes take place at ${site.location.venue}, Cumbernauld.` },
];

export default function BookPage() {
  const booking = getClassBookingAction();
  const external = booking.kind === "booking" && booking.external;
  const formEnabled = !external && isBookingFormEnabled();
  // Only confirmed times are offered as choices; otherwise visitors say when suits them.
  const sessions = isPublishable(timetable.status)
    ? sortSessions(timetable.sessions).map((s) => `${s.day} ${formatTime(s.start)}`)
    : [];

  return (
    <>
      <PageHeader
        eyebrow="Book"
        title="Book your class"
        intro="Request a place in a coached group kettlebell class in Cumbernauld. Alex will reply to confirm your place."
      />

      <Section labelledBy="booking-heading">
        <div className="grid grid-cols-1 gap-14 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <h2 id="booking-heading" className="sr-only">
              Booking request
            </h2>
            {external ? (
              <div className="bg-ink p-8 text-paper sm:p-10">
                <p className="text-lede text-muted-inverse">Bookings are taken on Alex&apos;s booking page.</p>
                <ButtonLink href={booking.href} external tone="dark" className="mt-6">
                  Continue to booking
                </ButtonLink>
              </div>
            ) : formEnabled ? (
              <BookingForm sessions={sessions} />
            ) : (
              <div className="bg-ink p-8 text-paper sm:p-10">
                <p className="eyebrow text-muted-inverse">Booking</p>
                <p className="mt-4 text-lede text-muted-inverse">
                  Online booking requests aren&apos;t open yet. To book a class, send Alex a message on
                  Instagram with the session you&apos;d like to join.
                </p>
                <ButtonLink href={site.social.instagram.url} external tone="dark" className="mt-8">
                  Message on Instagram
                </ButtonLink>
              </div>
            )}
          </div>

          <aside className="lg:col-span-4 lg:col-start-9" aria-labelledby="how-heading">
            <h2 id="how-heading" className="eyebrow text-muted">
              How it works
            </h2>
            <ol className="mt-4 space-y-6 border-t-2 border-ink pt-6">
              {steps.map((step, i) => (
                <li key={step.title} className="grid grid-cols-[2rem_1fr] gap-x-3">
                  <span className="eyebrow pt-1 text-muted" aria-hidden="true">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <h3 className="font-bold">{step.title}</h3>
                    <p className="mt-1 text-sm text-muted">{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
            <h2 className="eyebrow mt-10 text-muted">Where</h2>
            <address className="mt-3 text-sm not-italic leading-relaxed">
              {formatAddressLines().map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </address>
            <a href={mapsUrl()} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex min-h-11 items-center text-sm underline underline-offset-4">
              Get directions<span className="sr-only"> (opens in a new tab)</span>
            </a>
          </aside>
        </div>
      </Section>
    </>
  );
}
