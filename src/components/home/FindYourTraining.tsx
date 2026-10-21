import { images } from "@/content/images";
import { getService } from "@/content/services";
import type { Photo, Service } from "@/content/types";
import { publishable } from "@/lib/publish";
import { formatGbp } from "@/lib/schedule";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { PhotoFrame } from "@/components/ui/PhotoFrame";
import { Section, SectionHeading } from "@/components/ui/Section";
import { revealDelay } from "@/lib/reveal";

interface Option {
  service: Service;
  kind: string;
  photo: Photo;
  description: string;
  cta: string;
}

// Descriptions use only confirmed wording (Alex's class listing; the owner's service descriptions).
const options: Option[] = [
  {
    service: getService("group-classes"),
    kind: "In person · Group",
    photo: images.classes,
    description:
      "Kettlebell training in a group, built around strength, conditioning and movement quality. Exercises are scaled to your ability.",
    cta: "Explore Classes",
  },
  {
    service: getService("one-to-one"),
    kind: "In person · Individual",
    photo: images.oneToOne,
    description: "Face-to-face coaching with Alex, tailored to your goals, your experience and how you want to develop.",
    cta: "Explore 1:1 Coaching",
  },
  {
    service: getService("online-coaching"),
    kind: "Remote",
    photo: images.online,
    description: "Personalised programming, ongoing support and progression, wherever you train.",
    cta: "Explore Online Coaching",
  },
];

/** The three services, side by side from lg and stacked on phones. The hero's "Explore Training" jumps here. */
export function FindYourTraining() {
  return (
    <Section tone="ink" id="find-your-training" labelledBy="training-heading">
      <SectionHeading
        id="training-heading"
        eyebrow="Find your training"
        title="Three ways to train with RAENG"
        intro="Choose the format that fits how you want to work."
        tone="ink"
      />
      <ul className="mt-12 grid grid-cols-1 gap-12 sm:mt-16 lg:grid-cols-3 lg:gap-8">
        {options.map((o, i) => {
          const price = publishable(o.service.prices)[0];
          return (
            <li key={o.service.id} data-reveal style={revealDelay(i)} className="flex flex-col">
              <PhotoFrame photo={o.photo} sizes="(min-width: 1024px) 30vw, 100vw" className="aspect-[5/4] w-full lg:aspect-[4/5]" />
              <p className="eyebrow mt-6 text-muted-inverse">
                <span aria-hidden="true">{String(i + 1).padStart(2, "0")} · </span>
                {o.kind}
              </p>
              <h3 className="mt-2 font-display text-h2 lg:min-h-[2.1em]">{o.service.name}</h3>
              <p className="mt-4 flex-1 text-muted-inverse">{o.description}</p>
              {price ? (
                <p className="mt-5 border-t border-line-inverse pt-4 text-sm text-muted-inverse">
                  {price.prefix ? `${price.prefix} ` : ""}
                  <span className="text-lg font-bold text-paper tabular-nums">{formatGbp(price.amountGbp)}</span> {price.unit}
                </p>
              ) : null}
              <ButtonLink href={o.service.href} tone="dark" variant="secondary" className="mt-6 w-full sm:w-auto sm:self-start">
                {o.cta}
              </ButtonLink>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}
