import { getService } from "@/content/services";
import type { Service } from "@/content/types";
import { PRIMARY_CTA } from "@/lib/booking";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { KeepHyphens } from "@/components/ui/KeepHyphens";
import { Section } from "@/components/ui/Section";
import { PriceList } from "./PriceList";
import { Timetable } from "./Timetable";

interface Option {
  service: Service;
  tagline: string;
  /** Shows the class timetable under the tagline. */
  timetable?: boolean;
}

/**
 * "What I offer": the three ways to train side by side, each with its price
 * and the same "Get in touch" button. One place to compare and choose.
 */
export function WaysToTrain() {
  const options: Option[] = [
    {
      service: getService("group-classes"),
      tagline: "Coached group sessions at Media House, Cumbernauld. Beginners welcome.",
      timetable: true,
    },
    {
      service: getService("one-to-one"),
      tagline: "Face-to-face coaching, built around you.",
    },
    {
      service: getService("online-coaching"),
      tagline: "Personalised programming and support, wherever you train.",
    },
  ];

  return (
    <Section tone="ink" id="ways-to-train" labelledBy="ways-heading">
      <div className="max-w-3xl">
        <p className="eyebrow text-muted-inverse">What I offer</p>
        <h2 id="ways-heading" className="mt-4 font-display text-h2 text-balance">
          Choose how you train
        </h2>
        <p className="mt-5 max-w-2xl text-lede text-muted-inverse">
          Three ways to train with Alex: coached group classes and one-to-one sessions in Cumbernauld, or online
          coaching wherever you are.
        </p>
      </div>

      <ul className="mt-12 grid grid-cols-1 border-t border-line-inverse lg:grid-cols-3 lg:border-t-0">
        {options.map(({ service, tagline, timetable: showTimes }, i) => (
          <li
            key={service.id}
            className="flex flex-col border-b border-line-inverse py-10 lg:border-b-0 lg:border-l lg:px-8 lg:py-2 lg:first:border-l-0 lg:first:pl-0 lg:last:pr-0"
          >
            <p className="eyebrow text-muted-inverse" aria-hidden="true">
              {String(i + 1).padStart(2, "0")}
            </p>
            <h3 className="mt-4 font-display text-h3">
              <KeepHyphens>{service.name}</KeepHyphens>
            </h3>
            <p className="mt-3 text-muted-inverse">{tagline}</p>
            {showTimes ? (
              <div className="mt-6">
                <Timetable tone="ink" layout="stack" />
              </div>
            ) : null}
            <div className="mt-8 lg:mt-auto lg:pt-8">
              <PriceList prices={service.prices} tone="ink" />
              <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2">
                <ButtonLink href={PRIMARY_CTA.href} tone="dark">
                  {PRIMARY_CTA.label}
                  <span className="sr-only"> about {service.name.toLowerCase()}</span>
                </ButtonLink>
                <ButtonLink href={service.href} variant="text" tone="dark">
                  Details<span className="sr-only"> about {service.name.toLowerCase()}</span>
                </ButtonLink>
              </div>
            </div>
          </li>
        ))}
      </ul>

    </Section>
  );
}
