import Link from "next/link";
import { formatAddressLines, mapsUrl, site } from "@/content/site";
import { timetable } from "@/content/classes";
import { getBookingAction, getOnlineCoachingAction } from "@/lib/booking";
import { isPublishable } from "@/lib/publish";
import { describeTimetable } from "@/lib/schedule";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Section } from "@/components/ui/Section";

/**
 * "Where and how can I book?" answered in one place: the steps, the booking
 * button, and where and when sessions happen. Wording follows the real
 * booking route, so it never promises an online booking that doesn't exist.
 */
export function HowToBook() {
  const booking = getBookingAction("any");
  const online = getOnlineCoachingAction();
  const canBook = booking.kind === "booking";
  const times = isPublishable(timetable.status) ? describeTimetable(timetable.sessions) : null;

  const steps = canBook
    ? [
        { title: "Choose how you train", body: "A group class or a one-to-one session." },
        { title: "Pick a time", body: "Tap the booking button and choose the day and time that suit you." },
        { title: "Alex confirms your place", body: `He replies by email, then you come along to ${site.location.venue}.` },
      ]
    : [
        { title: "Choose how you train", body: "A group class or a one-to-one session." },
        { title: "Get in touch", body: `Message Alex on Instagram (${site.social.instagram.handle}) with what you'd like to book.` },
        { title: "Alex confirms your place", body: `Then you come along to ${site.location.venue}.` },
      ];

  return (
    <Section tone="surface" id="how-to-book" labelledBy="how-to-book-heading">
      <div className="grid grid-cols-1 gap-14 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-7">
          <p className="eyebrow text-muted">Booking</p>
          <h2 id="how-to-book-heading" className="mt-4 font-display text-h2 text-balance">
            Where and how to book
          </h2>
          <ol className="mt-10 space-y-7">
            {steps.map((step, i) => (
              <li key={step.title} className="grid grid-cols-[3rem_1fr] gap-x-4 border-t border-ink pt-5">
                <span className="font-display text-h3 leading-none" aria-hidden="true">
                  {i + 1}
                </span>
                <div>
                  <h3 className="text-lg font-bold">{step.title}</h3>
                  <p className="mt-1 text-muted">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-10 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:gap-8">
            <ButtonLink href={booking.href} external={booking.external}>
              {booking.label}
            </ButtonLink>
            {online.href !== "/contact" ? (
              <Link
                href={online.href}
                className="inline-flex min-h-11 items-center text-sm font-semibold uppercase tracking-[0.08em] underline-offset-[6px] hover:underline"
              >
                Online coaching? Start here <span aria-hidden="true" className="ml-2">→</span>
              </Link>
            ) : null}
          </div>
        </div>

        <div className="space-y-10 lg:col-span-5">
          <div>
            <h3 className="eyebrow text-muted">Where</h3>
            <address className="mt-4 border-t-2 border-ink pt-5 text-lg not-italic leading-relaxed">
              {formatAddressLines().map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </address>
            <p className="mt-2 text-sm text-muted">Group classes and one-to-one sessions, just outside Glasgow.</p>
            <ButtonLink href={mapsUrl()} external variant="secondary" className="mt-6">
              Get directions
            </ButtonLink>
          </div>
          <div>
            <h3 className="eyebrow text-muted">When</h3>
            <p className="mt-4 border-t-2 border-ink pt-5 text-lg">
              {times ?? (canBook ? "Choose a day and time when you book. Alex confirms every place." : "Alex will let you know the current class times.")}
            </p>
          </div>
        </div>
      </div>
    </Section>
  );
}
