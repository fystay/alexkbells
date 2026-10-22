import { formatAddressLines, mapsUrl, site } from "@/content/site";
import { bookingMode, parseBookingUrl } from "@/lib/booking";
import type { BookableService } from "@/lib/booking-options";
import { groupClass } from "@/content/classes";
import { getService } from "@/content/services";
import { publishedClasses } from "@/lib/class-sessions";
import { publishable } from "@/lib/publish";
import { formatGbp } from "@/lib/schedule";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { BookingWizard, type ClassInfo } from "./BookingWizard";
import { DemoNotice, InstagramFallback } from "./ui";

interface BookingPageProps {
  title: string;
  initialService?: BookableService;
}

/** Shared by /book, /book/group-class and /book/one-to-one. */
export function BookingPage({ title, initialService }: BookingPageProps) {
  const mode = bookingMode();
  const external = mode === "external" ? parseBookingUrl(process.env.BOOKING_URL) : null;

  const price = publishable(getService("group-classes").prices)[0];
  const classInfo: ClassInfo = { ...groupClass, price: price ? `${formatGbp(price.amountGbp)} ${price.unit}` : "" };

  const intro =
    mode === "demo"
      ? initialService
        ? "Choose a date and time."
        : "Choose a service, then a date and time."
      : mode === "request"
        ? `${initialService ? "Choose when suits you." : "Choose a service, then when suits you."} Alex confirms every place personally.`
        : "Group classes and one-to-one coaching at Media House, Cumbernauld.";

  return (
    <section aria-labelledby="book-heading" className="bg-paper">
      <div className="container-page pt-6 pb-16 sm:pt-10 lg:pb-24">
        <header className="max-w-2xl">
          <p className="eyebrow text-muted">Book · {site.location.venue}, {site.location.town}</p>
          <h1 id="book-heading" className="mt-3 font-display text-h2 text-balance">
            {title}
          </h1>
          <p className="mt-4 text-lede text-muted">{intro}</p>
        </header>

        {mode === "demo" ? (
          <div className="mt-5 max-w-2xl">
            <DemoNotice>
              <strong>Prototype booking page.</strong> Availability is sample data, not Alex&apos;s real timetable,
              and nothing you choose is booked or sent.
            </DemoNotice>
          </div>
        ) : null}

        <div className="mt-8 lg:mt-10">
          {external ? (
            <div className="max-w-2xl rounded-lg border border-grey bg-white p-8 sm:p-10">
              <p className="text-lede">Bookings are taken on Alex&apos;s booking page.</p>
              <ButtonLink href={external.toString()} external className="mt-6">
                Continue to booking
              </ButtonLink>
            </div>
          ) : mode === "demo" || mode === "request" ? (
            <>
              <noscript>
                <p className="mb-6 border-2 border-ink p-5">
                  Booking needs JavaScript. You can also message Alex on Instagram ({site.social.instagram.handle}).
                </p>
              </noscript>
              <BookingWizard mode={mode} initialService={initialService} classes={publishedClasses()} classInfo={classInfo} />
            </>
          ) : (
            <div className="max-w-2xl">
              <InstagramFallback>
                Online booking isn&apos;t open yet. To book a class or a one-to-one session, send Alex a message on
                Instagram.
              </InstagramFallback>
            </div>
          )}
        </div>

        <p className="mt-14 max-w-2xl border-t border-line pt-6 text-sm text-muted">
          Sessions take place at {formatAddressLines().join(", ")}.{" "}
          <a href={mapsUrl()} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center underline underline-offset-4">
            Get directions<span className="sr-only"> (opens in a new tab)</span>
          </a>
        </p>
      </div>
    </section>
  );
}
