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
    description: "Kettlebell training for strength, conditioning and movement quality, scaled to your ability. Pay as you go or join with a membership.",
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

/** The three services as three numbered rows on hairlines: quiet, scannable, no pictures. */
export function FindYourTraining() {
  return (
    <Section id="find-your-training" labelledBy="training-heading">
      <SectionHeading id="training-heading" eyebrow="Ways to train" title="Find your training" />
      <ul className="mt-10 border-b border-line-inverse lg:mt-14">
        {options.map((o, i) => {
          const price = publishable(o.service.prices)[0];
          return (
            <li
              key={o.service.id}
              data-reveal
              style={revealDelay(i)}
              className="grid grid-cols-1 gap-x-8 gap-y-3 border-t border-line-inverse py-7 lg:grid-cols-12 lg:items-center lg:py-9"
            >
              <p className="eyebrow text-muted-inverse lg:col-span-3">
                <span aria-hidden="true">{String(i + 1).padStart(2, "0")} · </span>
                {o.kind}
              </p>
              <div className="lg:col-span-5">
                <h3 className="font-display text-h3">{o.service.name}</h3>
                <p className="mt-2 text-muted-inverse">{o.description}</p>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1 lg:col-span-4 lg:justify-end">
                {price ? (
                  <p className="text-sm text-muted-inverse">
                    {price.prefix ? `${price.prefix} ` : ""}
                    <span className="text-lg font-medium text-paper tabular-nums">{formatGbp(price.amountGbp)}</span> {price.unit}
                  </p>
                ) : null}
                <ButtonLink href={o.service.href} tone="dark" variant="text">
                  {o.cta}
                </ButtonLink>
              </div>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}
