import type { Metadata } from "next";
import { formatAddressLines, mapsUrl, site } from "@/content/site";
import { getClassBookingAction } from "@/lib/booking";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Section } from "@/components/ui/Section";
import { PageHeader } from "@/components/sections/PageHeader";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Get in touch with Alex K Bells about group kettlebell classes, one-to-one coaching or online coaching in Cumbernauld.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  const { email, phone } = site.contact;
  const booking = getClassBookingAction();

  return (
    <>
      <PageHeader
        eyebrow="Contact"
        title="Get in touch"
        intro="Ask about group classes, one-to-one coaching or online coaching. The quickest way to reach Alex is a message on Instagram."
      />

      <Section labelledBy="methods-heading">
        <h2 id="methods-heading" className="sr-only">
          Ways to get in touch
        </h2>
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <div id="enquire" className="bg-ink p-8 text-paper sm:p-12">
              <p className="eyebrow text-muted-inverse">Message on Instagram</p>
              <p className="mt-4 font-display text-h2 break-words">{site.social.instagram.handle}</p>
              <p className="mt-4 max-w-md text-muted-inverse">
                Send a direct message with what you are interested in (classes, one-to-one or
                online coaching) and any questions you have.
              </p>
              <ButtonLink href={site.social.instagram.url} external tone="dark" className="mt-8">
                Open Instagram
              </ButtonLink>
            </div>

            {email || phone ? (
              <dl className="mt-10 divide-y divide-line border-y border-line">
                {email ? (
                  <div className="flex flex-wrap justify-between gap-2 py-4">
                    <dt className="eyebrow text-muted">Email</dt>
                    <dd>
                      <a href={`mailto:${email}`} className="font-semibold underline underline-offset-4">
                        {email}
                      </a>
                    </dd>
                  </div>
                ) : null}
                {phone ? (
                  <div className="flex flex-wrap justify-between gap-2 py-4">
                    <dt className="eyebrow text-muted">Phone</dt>
                    <dd>
                      <a href={`tel:${phone.replace(/\s+/g, "")}`} className="font-semibold underline underline-offset-4">
                        {phone}
                      </a>
                    </dd>
                  </div>
                ) : null}
              </dl>
            ) : null}

            {booking.kind === "booking" ? (
              <p className="mt-8 text-muted">
                Ready to come to a class?{" "}
                <a href={booking.href} target="_blank" rel="noopener noreferrer" className="font-semibold text-ink underline underline-offset-4">
                  Book online<span className="sr-only"> (opens in a new tab)</span>
                </a>
                .
              </p>
            ) : null}
          </div>

          <div className="lg:col-span-4 lg:col-start-9">
            <h2 className="eyebrow text-muted">Training location</h2>
            <address className="mt-4 border-t-2 border-ink pt-6 text-lg not-italic leading-relaxed">
              {formatAddressLines().map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </address>
            <ButtonLink href={mapsUrl()} external variant="secondary" className="mt-8">
              Get directions
            </ButtonLink>
          </div>
        </div>
      </Section>
    </>
  );
}
