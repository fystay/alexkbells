import Link from "next/link";
import { getService } from "@/content/services";
import type { Service } from "@/content/types";
import { publishable } from "@/lib/publish";
import { formatGbp } from "@/lib/schedule";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Section, SectionHeading } from "@/components/ui/Section";
import { revealDelay } from "@/lib/reveal";

interface Option {
  service: Service;
  kind: string;
  description: string;
  cta: string;
}

// Descriptions use only confirmed wording (Alex's class listing; the owner's service descriptions).
const options: Option[] = [
  {
    service: getService("group-classes"),
    kind: "In person · Group",
    description:
      "Kettlebell training built around strength, conditioning and movement quality, with exercises scaled to your ability. Pay as you go or join with a membership.",
    cta: "Explore Classes",
  },
  {
    service: getService("one-to-one"),
    kind: "In person · Individual",
    description: "Face-to-face coaching with Alex, tailored to your goals, your experience and how you want to develop.",
    cta: "Explore 1:1 Coaching",
  },
  {
    service: getService("online-coaching"),
    kind: "Remote",
    description: "Personalised programming, ongoing support and progression, wherever you train.",
    cta: "Explore Online Coaching",
  },
];

/** The three services, as plain type on hairlines: no pictures, so the page stays quiet. */
export function FindYourTraining() {
  return (
    <Section tone="paper" id="find-your-training" labelledBy="training-heading">
      <SectionHeading id="training-heading" eyebrow="Ways to train" title="Find your training" intro="Choose the format that fits how you want to work." />
      <ul className="mt-12 grid grid-cols-1 gap-12 lg:mt-16 lg:grid-cols-3 lg:gap-10">
        {options.map((o, i) => {
          const price = publishable(o.service.prices)[0];
          return (
            <li key={o.service.id} data-reveal style={revealDelay(i)} className="flex flex-col border-t-2 border-ink pt-5">
              <p className="eyebrow text-muted">
                <span aria-hidden="true">{String(i + 1).padStart(2, "0")} · </span>
                {o.kind}
              </p>
              <h3 className="mt-3 font-display text-h2">{o.service.name}</h3>
              <p className="mt-4 flex-1 text-muted">{o.description}</p>
              {price ? (
                <p className="mt-5 text-sm text-muted">
                  {price.prefix ? `${price.prefix} ` : ""}
                  <span className="text-lg font-bold text-ink tabular-nums">{formatGbp(price.amountGbp)}</span> {price.unit}
                </p>
              ) : null}
              <ButtonLink href={o.service.href} variant="secondary" className="mt-6 w-full sm:w-auto sm:self-start">
                {o.cta}
              </ButtonLink>
            </li>
          );
        })}
      </ul>
      <p className="mt-10 text-muted">
        Training more than once a week?{" "}
        <Link href="/memberships" className="font-semibold text-ink underline underline-offset-4 hover:no-underline">
          Compare class memberships
        </Link>
        .
      </p>
    </Section>
  );
}
