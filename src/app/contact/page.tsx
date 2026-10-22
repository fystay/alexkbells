import type { Metadata } from "next";
import { pageMetadata } from "@/lib/metadata";
import { formatAddressLines, mapsUrl, site } from "@/content/site";
import Link from "next/link";
import { getOnlineCoachingAction, getPrimaryCta } from "@/lib/booking";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Section } from "@/components/ui/Section";
import { PageHeader } from "@/components/sections/PageHeader";

export const metadata: Metadata = pageMetadata({
  title: "Contact",
  description:
    "Get in touch with RAENG Kettlebell Club about classes, memberships, 1:1 coaching or online coaching in Cumbernauld, Glasgow.",
  path: "/contact",
});

export default function ContactPage() {
  const { email, phone } = site.contact;
  const online = getOnlineCoachingAction();
  const booking = getPrimaryCta();

  return (
    <>
      <PageHeader
        eyebrow="Contact"
        title="Get in touch"
        intro="Ask about group classes, memberships, 1:1 coaching or online coaching. The quickest way to reach Alex is a message on Instagram."
      >
        {/* The page's one action, in the first screen at every width. */}
        <ButtonLink
          href={site.social.instagram.url}
          external
         
          className="w-full whitespace-normal text-center sm:w-auto sm:whitespace-nowrap"
        >
          Message Alex on Instagram
        </ButtonLink>
      </PageHeader>

      <Section labelledBy="methods-heading">
        <h2 id="methods-heading" className="sr-only">
          Ways to get in touch
        </h2>
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <div id="enquire" className="rounded-3xl border border-grey bg-white p-8 sm:p-12">
              <p className="eyebrow ">Message on Instagram</p>
              <p className="mt-4 font-display text-h2 break-words">
                <a
                  href={site.social.instagram.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center decoration-2 underline-offset-[6px] hover:underline focus-visible:outline-paper"
                >
                  {site.social.instagram.handle}
                  <span className="sr-only"> on Instagram (opens in a new tab)</span>
                </a>
              </p>
              <p className="mt-4 max-w-md ">
                Send a direct message on Instagram. It helps to include:
              </p>
              <ul className="mt-3 max-w-md list-disc space-y-1 pl-5  marker:">
                <li>What you are interested in: group classes, a membership, 1:1 or online coaching</li>
                <li>Whether you have trained with kettlebells before</li>
                <li>Any questions you have</li>
              </ul>
              {/* A plain, always-visible link to the profile for class news and updates. */}
              <div className="mt-8 border-t border-grey pt-6">
                <ButtonLink
                  href={site.social.instagram.url}
                  external
                 
                  variant="secondary"
                  className="w-full py-3 sm:w-auto"
                >
                  <span className="whitespace-normal text-center">
                    Follow {site.social.instagram.handle} for updates
                  </span>
                </ButtonLink>
              </div>
            </div>
            <p className="mt-6 ">
              Also on Facebook:{" "}
              <a
                href={site.social.facebook.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center font-semibold  underline underline-offset-4 hover:no-underline"
              >
                {site.social.facebook.name}
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            </p>

            {email || phone ? (
              <dl className="mt-10 divide-y divide-grey border-y border-grey">
                {email ? (
                  <div className="flex flex-wrap justify-between gap-2 py-4">
                    <dt className="eyebrow ">Email</dt>
                    <dd>
                      <a href={`mailto:${email}`} className="font-semibold underline underline-offset-4">
                        {email}
                      </a>
                    </dd>
                  </div>
                ) : null}
                {phone ? (
                  <div className="flex flex-wrap justify-between gap-2 py-4">
                    <dt className="eyebrow ">Phone</dt>
                    <dd>
                      <a href={`tel:${phone.replace(/\s+/g, "")}`} className="font-semibold underline underline-offset-4">
                        {phone}
                      </a>
                    </dd>
                  </div>
                ) : null}
              </dl>
            ) : null}

            {/* Booking is a request on the website when the form is open; this page is for messaging. */}
            {booking.kind === "booking" ? (
              <p className="mt-8 ">
                Ready to book a group class or a one-to-one session?{" "}
                <Link href={booking.href} className="font-semibold  underline underline-offset-4">
                  Send a booking request
                </Link>{" "}
                and Alex confirms your place.
              </p>
            ) : null}

            {/* Only when the online enquiry form can actually send. */}
            {online.href !== "/contact" ? (
              <p className="mt-8 ">
                Interested in online coaching? Answer a few quick questions and Alex replies personally:{" "}
                <Link href={online.href} className="font-semibold  underline underline-offset-4">
                  enquire about online coaching
                </Link>
                .
              </p>
            ) : null}
          </div>

          <div className="lg:col-span-4 lg:col-start-9">
            <h2 className="eyebrow ">Training location</h2>
            <address className="mt-4 border-t-2 border-grey pt-6 text-lg not-italic leading-relaxed">
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
