import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { pageMetadata } from "@/lib/metadata";
import { mapsUrl, site } from "@/content/site";
import { faq } from "@/content/faq";
import { firstClassSteps } from "@/content/home";
import { isPublishable } from "@/lib/publish";
import { Section, SectionHeading } from "@/components/ui/Section";
import { PageHeader } from "@/components/sections/PageHeader";
import { Faq } from "@/components/sections/Faq";

export const metadata: Metadata = pageMetadata({
  title: "FAQs & Contact",
  description:
    "Common questions and contact details for RAENG Fitness: classes, memberships, 1:1 coaching and small group coaching in Cumbernauld, Glasgow.",
  path: "/contact",
});

const linkClass = "inline-flex min-h-11 shrink-0 items-center font-semibold underline underline-offset-4 hover:no-underline";

/** One way in: what it is (and its detail), and its link on the right. */
function Way({ title, detail, children }: { title: string; detail?: ReactNode; children: ReactNode }) {
  return (
    <li className="flex items-center justify-between gap-4 border-line px-4 py-3 sm:px-6 [&+&]:border-t">
      <div className="min-w-0 py-1">
        <p className="card-title">{title}</p>
        {detail ? <div className="mt-0.5 text-[0.9375rem]">{detail}</div> : null}
      </div>
      {children}
    </li>
  );
}

/**
 * FAQs & Contact, in the order of Alex's layout (2026-10-29): common questions,
 * contact details (email and phone only once confirmed, then the address with
 * directions), Instagram, getting started. Nothing else (no Book row, no
 * Facebook; the footer has it).
 */
export default function ContactPage() {
  const { email, phone } = site.contact;
  const l = site.location;
  const live = (id: string) => {
    const item = faq.find((f) => f.id === id);
    return item !== undefined && isPublishable(item.status);
  };
  const started: string[] = [];
  if (live("beginners")) started.push(firstClassSteps.beginners);
  if (live("first-session")) started.push(firstClassSteps.firstSession);
  if (live("bring")) started.push(firstClassSteps.bring);

  return (
    <>
      <PageHeader eyebrow="FAQs & Contact" title="FAQs & Contact" intro="Book, message Alex, or come and find us." />

      <Faq tone="plain" />

      <Section tone="white" id="contact-details" labelledBy="details-heading">
        <div className="lg:grid lg:grid-cols-12 lg:gap-x-14">
          <SectionHeading id="details-heading" className="lg:col-span-5" eyebrow="Contact details" title="Find us." />
          <ul id="ways" className="mt-8 max-w-2xl overflow-hidden rounded-[1.75rem] border-[1.5px] border-ink lg:col-span-7 lg:mt-0">
            {email ? (
              <Way title="Email" detail={email}>
                <a href={`mailto:${email}`} className={linkClass}>
                  Email<span className="sr-only"> {email}</span>
                </a>
              </Way>
            ) : null}
            {phone ? (
              <Way title="Phone" detail={phone}>
                <a href={`tel:${phone.replace(/\s+/g, "")}`} className={linkClass}>
                  Call<span className="sr-only"> {phone}</span>
                </a>
              </Way>
            ) : null}
            <Way title={l.street} detail={<address className="not-italic">{`${l.town}, ${l.city}, ${l.postcode}`}</address>}>
              <a href={mapsUrl()} target="_blank" rel="noopener noreferrer" className={linkClass}>
                Directions<span className="sr-only"> to the class location (opens in a new tab)</span>
              </a>
            </Way>
          </ul>
        </div>
      </Section>

      <Section tone="plain" id="instagram" labelledBy="instagram-heading">
        <div className="lg:grid lg:grid-cols-12 lg:gap-x-14">
          <SectionHeading id="instagram-heading" className="lg:col-span-5" eyebrow="Instagram" title={site.social.instagram.handle} />
          <p className="mt-6 lg:col-span-7 lg:mt-0">
            <a href={site.social.instagram.url} target="_blank" rel="noopener noreferrer" className={linkClass}>
              Message Alex on Instagram<span className="sr-only"> (opens in a new tab)</span>
            </a>
          </p>
        </div>
      </Section>

      {started.length > 0 ? (
        <Section tone="white" id="getting-started" labelledBy="started-heading">
          <div className="lg:grid lg:grid-cols-12 lg:gap-x-14">
            <SectionHeading id="started-heading" className="lg:col-span-5" eyebrow="Getting started" title="Your first class." />
            <div className="mt-8 lg:col-span-7 lg:mt-0">
              <ul className="lined max-w-xl">
                {started.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
              <Link href="/classes" className={`mt-4 ${linkClass}`}>
                View classes and book
              </Link>
            </div>
          </div>
        </Section>
      ) : null}
    </>
  );
}
