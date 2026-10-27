import type { Metadata } from "next";
import { pageMetadata } from "@/lib/metadata";
import { site } from "@/content/site";
import Link from "next/link";
import { getOnlineCoachingAction, getPrimaryCta } from "@/lib/booking";
import { AddressCard } from "@/components/sections/AddressCard";
import { StartTraining } from "@/components/ui/StartTraining";
import { Section } from "@/components/ui/Section";
import { PageHeader } from "@/components/sections/PageHeader";
import { Faq } from "@/components/sections/Faq";

export const metadata: Metadata = pageMetadata({
  title: "Contact",
  description:
    "Contact RAENG Fitness about classes, memberships, 1:1 coaching or online coaching in Cumbernauld, Glasgow.",
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
        title="Contact RAENG"
        intro="Ask about group classes, memberships, 1:1 coaching or online coaching. The quickest way to reach Alex is a message on Instagram."
      >
        {/* Book now is the main button on every page (owner rule; audit 2026-10-27), with Instagram beside it. */}
        <StartTraining href={booking.href} label={booking.label} external={booking.external} className="w-full sm:w-[22rem]" />
        <a
          href={site.social.instagram.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center self-center font-semibold underline underline-offset-4 hover:no-underline sm:ml-4"
        >
          Message Alex on Instagram<span className="sr-only"> (opens in a new tab)</span>
        </a>
      </PageHeader>

      <Section tone="white" labelledBy="methods-heading" className="pt-4 sm:pt-4 lg:pt-4">
        <h2 id="methods-heading" className="sr-only">
          Ways to reach us
        </h2>
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
          <div className="lg:col-span-7">
            {/* No box, and Instagram linked once more only (the handle): the header's button is the action (2026-10-26). */}
            <div id="enquire">
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
              <ul className="lined mt-3 max-w-md">
                <li>What you are interested in: group classes, a membership, 1:1 or online coaching</li>
                <li>Whether you have trained with kettlebells before</li>
                <li>Any questions you have</li>
              </ul>
            </div>
            {email || phone ? (
              <dl className="mt-8 space-y-3">
                {email ? (
                  <div className="flex flex-wrap justify-between gap-2">
                    <dt className="eyebrow ">Email</dt>
                    <dd>
                      <a href={`mailto:${email}`} className="font-semibold underline underline-offset-4">
                        {email}
                      </a>
                    </dd>
                  </div>
                ) : null}
                {phone ? (
                  <div className="flex flex-wrap justify-between gap-2">
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

            {/* The other ways in, as one short list instead of three loose paragraphs (owner, 2026-10-27). */}
            <p className="eyebrow mt-12">Other ways</p>
            <ul className="lined mt-4 max-w-xl">
              {/* Only when the online enquiry form can actually send. */}
              {online.href !== "/contact" ? (
                <li>
                  <p>
                    Interested in online coaching? Answer a few quick questions and Alex replies personally:{" "}
                    <Link href={online.href} className="font-semibold  underline underline-offset-4">
                      enquire about online coaching
                    </Link>
                    .
                  </p>
                </li>
              ) : null}
              <li>
                <p>
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
              </li>
            </ul>
          </div>

          <div className="lg:col-span-4 lg:col-start-9">
            <h2 className="eyebrow ">Training location</h2>
            <AddressCard large className="mt-4" />
          </div>
        </div>
      </Section>
      {/* Every common question in one place (2026-10-26), instead of repeated on each page. */}
      {/* Only what isn't answered elsewhere (2026-10-27): where, when, length, beginners, the first session and what to bring are on the home page and /classes. */}
      <Faq tone="plain" ids={["online", "one-to-one", "contact"]} />
    </>
  );
}
