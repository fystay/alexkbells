import type { Metadata } from "next";
import { pageMetadata } from "@/lib/metadata";
import { site } from "@/content/site";
import Link from "next/link";
import type { Service } from "@/content/types";
import { getService } from "@/content/services";
import { getPrimaryCta } from "@/lib/booking";
import { cn } from "@/lib/cn";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Section } from "@/components/ui/Section";
import { PageHeader } from "@/components/sections/PageHeader";
import { PriceList } from "@/components/sections/PriceList";
import { CtaBand } from "@/components/sections/CtaBand";
import { KeepHyphens } from "@/components/ui/KeepHyphens";

export const metadata: Metadata = pageMetadata({
  title: "One-to-One & Online Kettlebell Coaching",
  description:
    "Face-to-face kettlebell coaching in Cumbernauld tailored to you, or online coaching with personalised programming, support and progression.",
  path: "/coaching",
});

function ServiceDetail({
  service,
  index,
  tone,
  intro,
}: {
  service: Service;
  index: string;
  tone: "paper" | "ink";
  intro: string;
}) {
  const enquiry = getPrimaryCta();
  const headingId = `${service.id}-heading`;
  const muted = tone === "ink" ? "text-muted-inverse" : "text-muted";
  const rule = tone === "ink" ? "border-line-inverse" : "border-line";

  return (
    <Section tone={tone} id={service.id === "online-coaching" ? "online" : service.id} labelledBy={headingId}>
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-12">
        <div className="lg:col-span-6">
          <p className={cn("eyebrow", muted)}>{index}</p>
          <h2 id={headingId} className="mt-4 font-display text-h2 text-balance">
            <KeepHyphens>{service.name}</KeepHyphens>
          </h2>
          <p className={cn("mt-6 max-w-xl text-lede", muted)}>{intro}</p>
          <ButtonLink
            href={enquiry.href}
            tone={tone === "ink" ? "dark" : "light"}
            className="mt-10"
          >
            {enquiry.label}
            <span className="sr-only"> with {service.name.toLowerCase()}</span>
          </ButtonLink>
        </div>
        <div className="space-y-10 lg:col-span-5 lg:col-start-8">
          {service.points.length > 0 ? (
            <div>
              <h3 className={cn("eyebrow", muted)}>What it involves</h3>
              <ul className={cn("mt-4 divide-y border-y", rule, tone === "ink" ? "divide-line-inverse" : "divide-line")}>
                {service.points.map((point) => (
                  <li key={point} className="py-4 font-semibold">
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <div>
            <h3 className={cn("eyebrow mb-4", muted)}>Pricing</h3>
            <PriceList prices={service.prices} tone={tone} />
          </div>
        </div>
      </div>
    </Section>
  );
}

export default function CoachingPage() {
  const oneToOne = getService("one-to-one");
  const online = getService("online-coaching");

  return (
    <>
      <PageHeader
        image={site.pageImages.coaching}
        eyebrow="Personal coaching"
        title="Coaching built around you"
        intro="Train face to face with Alex in Cumbernauld, or follow a personalised programme online."
      >
        <nav aria-label="Coaching options" className="flex flex-wrap gap-3">
          <ButtonLink href="#one-to-one" variant="secondary">
            One-to-one
          </ButtonLink>
          <ButtonLink href="#online" variant="secondary">
            Online
          </ButtonLink>
        </nav>
      </PageHeader>

      <ServiceDetail
        service={oneToOne}
        index="01"
        tone="paper"
        intro="One-to-one kettlebell coaching, face to face and tailored to you as an individual. Get in touch to arrange a session or talk through what you want from your training."
      />
      <ServiceDetail
        service={online}
        index="02"
        tone="ink"
        intro="Online coaching with personalised programming, support and progression, so you can train with a plan wherever you are. Get in touch to talk through your goals."
      />

      <Section tone="surface" spacing="compact" labelledBy="classes-link-heading">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 id="classes-link-heading" className="text-lg font-bold">
            Prefer training in a group?
          </h2>
          <Link
            href="/classes"
            className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold uppercase tracking-[0.08em] underline underline-offset-[6px] hover:no-underline"
          >
            See group classes <span aria-hidden="true">→</span>
          </Link>
        </div>
      </Section>

      <CtaBand />
    </>
  );
}
