import { site } from "@/content/site";
import { getService } from "@/content/services";
import type { Service } from "@/content/types";
import { getPrimaryCta } from "@/lib/booking";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { KeepHyphens } from "@/components/ui/KeepHyphens";
import { SectionHeading } from "@/components/ui/Section";
import { PriceList } from "./PriceList";
import { Timetable } from "./Timetable";

interface Option {
  service: Service;
  tagline: string;
  /** Shows the class timetable under the tagline. */
  timetable?: boolean;
}

/**
 * "What I offer". One landmark in two bands: the heading on paper, carrying on
 * from the hero, then the three ways to train side by side on ink, each with
 * its price and the same "Start your training" button. One place to compare
 * and choose.
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
  const cta = getPrimaryCta();

  return (
    <section id="ways-to-train" aria-labelledby="ways-heading">
      <div className="bg-paper pt-6 pb-12 text-ink sm:pt-8 sm:pb-16 lg:pt-12 lg:pb-20">
        <div className="container-page">
          <SectionHeading
            id="ways-heading"
            eyebrow="What I offer"
            title="Choose how you train"
            intro={`Three ways to train with Alex: coached group classes and one-to-one sessions in ${site.location.town}, or online coaching wherever you are.`}
          />
        </div>
      </div>

      <div className="bg-ink py-12 text-paper sm:py-16 lg:py-20">
        <div className="container-page">
          <ul className="grid grid-cols-1 border-t border-line-inverse lg:grid-cols-3 lg:border-t-0">
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
                  <PriceList prices={service.prices} tone="ink" linkContact={false} />
                  <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2">
                    <ButtonLink href={cta.href} tone="dark">
                      {cta.label}
                      <span className="sr-only"> with {service.name.toLowerCase()}</span>
                    </ButtonLink>
                    <ButtonLink href={service.href} variant="text" tone="dark">
                      Details<span className="sr-only"> about {service.name.toLowerCase()}</span>
                    </ButtonLink>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
