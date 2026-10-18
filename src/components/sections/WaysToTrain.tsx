import Image from "next/image";
import { site } from "@/content/site";
import { getService } from "@/content/services";
import type { Photo, Service } from "@/content/types";
import { ENQUIRY_HREF } from "@/lib/booking";
import { cn } from "@/lib/cn";
import { publishable } from "@/lib/publish";
import { formatGbp } from "@/lib/schedule";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Carousel } from "@/components/ui/Carousel";
import { KeepHyphens } from "@/components/ui/KeepHyphens";
import { SectionHeading } from "@/components/ui/Section";
import { Provisional } from "@/components/ui/Provisional";
import { Timetable } from "./Timetable";

interface Option {
  service: Service;
  /** One short line, open to everybody: no fitness level, frequency or result is promised. */
  pitch: string;
  /** Small facts under it: where or what's included. */
  details: string;
  /** Shows the class times as three small columns. */
  times?: boolean;
}

/**
 * The card photos reuse the site's existing training stills (nothing is
 * invented). There is no online-coaching photo yet, so that card shows the
 * single-bell hold. `position` keeps the person and bells in the landscape crop.
 */
const cardImages: Record<Service["id"], { photo: Photo | null; position: string }> = {
  "group-classes": { photo: site.pageImages.classes, position: "object-[50%_48%]" },
  "one-to-one": { photo: site.pageImages.coaching, position: "object-[50%_58%]" },
  "online-coaching": { photo: site.pageImages.contact, position: "object-[50%_8%]" },
};

/** The service's first published price on one line, e.g. "From £35 per session". The detail pages list them all. */
function LeadPrice({ service }: { service: Service }) {
  const price = publishable(service.prices)[0];
  if (!price) return <p className="text-muted-inverse">Price on request</p>;
  return (
    <Provisional status={price.status}>
      <p className="flex items-baseline gap-1.5">
        {price.prefix ? <span className="text-sm text-muted-inverse">{price.prefix}</span> : null}
        <span className="text-2xl font-bold tabular-nums">{formatGbp(price.amountGbp)}</span>
        <span className="text-sm text-muted-inverse">{price.unit}</span>
      </p>
    </Provisional>
  );
}

/**
 * "What I offer". One band, heading included: ink after the paper hero on
 * tablets and desktop, and paper on phones, where the hero is the dark
 * edge-to-edge video, so the page always alternates black and white. Each way to train is an open column rather than
 * a boxed card, kept minimal: a portrait photo with its number and name set
 * over a fade, one line, one line of small details, the lead price, and
 * Enquire / Details.
 *
 * Below lg the cards are a swipe carousel (one card mostly in view, the next
 * peeking in; dots and arrows); from lg they are three columns. The cards are
 * the same height so nothing jumps while swiping.
 */
export function WaysToTrain() {
  const options: Option[] = [
    {
      service: getService("group-classes"),
      pitch: "Train together. Every level welcome.",
      details: `Coached group sessions · ${site.location.venue}`,
      times: true,
    },
    {
      service: getService("one-to-one"),
      pitch: "Every rep coached, built around you.",
      details: `Face to face with Alex · ${site.location.venue}`,
    },
    {
      service: getService("online-coaching"),
      pitch: "Your plan, with Alex in your corner.",
      details: "Personalised programming · Ongoing support",
    },
  ];

  return (
    <section id="ways-to-train" aria-labelledby="ways-heading" className={cn(
        "bg-ink pt-12 pb-16 text-paper sm:py-20 lg:py-28",
        // Phones: light band. Ink-only tokens inside (muted text, hairlines, the class times) flip to their paper twins.
        "max-sm:bg-paper max-sm:text-ink max-sm:[&_.border-line-inverse]:border-line max-sm:[&_.text-muted-inverse]:text-muted",
      )}>
      <div className="container-page">
        <div className="grid grid-cols-1 gap-5 border-b border-line-inverse pb-8 sm:pb-12 lg:grid-cols-12 lg:items-end lg:gap-8 lg:pb-14">
          <SectionHeading id="ways-heading" tone="ink" eyebrow="What I offer" title="Choose how you train" className="lg:col-span-7" />
          <p className="max-w-md text-lede text-balance text-muted-inverse lg:col-span-5">
            In person in {site.location.town}, or online wherever you are.
          </p>
        </div>

        <div className="mt-8 sm:mt-12 lg:mt-14">
          <Carousel label="Ways to train" slideLabels={options.map((o) => o.service.name)} lightOnPhones>
            {options.map(({ service, pitch, details, times }, i) => {
              const image = cardImages[service.id];
              return (
                <div key={service.id} className="group flex w-full flex-col">
                  <div className="relative aspect-square overflow-hidden bg-ink-soft sm:aspect-[4/5]">
                    {image.photo ? (
                      <Image
                        src={image.photo.src}
                        alt={image.photo.alt}
                        width={image.photo.width}
                        height={image.photo.height}
                        sizes="(min-width: 1024px) 30vw, (min-width: 640px) 24rem, 86vw"
                        className={cn(
                          "size-full object-cover grayscale motion-safe:transition-transform motion-safe:duration-700 motion-safe:ease-out motion-safe:group-hover:scale-[1.03]",
                          image.position,
                        )}
                      />
                    ) : null}
                    {/* Decorative fade so the name reads over any photo. */}
                    <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-3/5 bg-linear-to-t from-ink via-ink/60 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-5 text-paper sm:p-6">
                      <p className="eyebrow text-paper/70" aria-hidden="true">
                        {String(i + 1).padStart(2, "0")}
                      </p>
                      <h3 className="mt-2 font-display text-h3">
                        <KeepHyphens>{service.name}</KeepHyphens>
                      </h3>
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col pt-5 sm:pt-6">
                    <p className="text-lg text-paper max-sm:text-ink">{pitch}</p>
                    <p className="mt-1.5 text-sm text-muted-inverse">{details}</p>
                    {times ? (
                      <div className="mt-5">
                        <Timetable tone="ink" layout="mini" />
                      </div>
                    ) : null}
                    <div className="mt-auto pt-6">
                      <div className="border-t border-line-inverse pt-5">
                        <LeadPrice service={service} />
                      </div>
                      <div className="mt-5 flex flex-col gap-1 lg:flex-row lg:items-center lg:gap-x-6">
                        <ButtonLink
                          href={ENQUIRY_HREF}
                          tone="dark"
                          className="w-full max-sm:bg-ink max-sm:text-paper max-sm:hover:bg-ink-soft max-sm:focus-visible:outline-ink lg:w-auto"
                        >
                          Enquire<span className="sr-only"> about {service.name.toLowerCase()}</span>
                        </ButtonLink>
                        <ButtonLink
                          href={service.href}
                          variant="text"
                          tone="dark"
                          className="w-full max-sm:text-ink max-sm:focus-visible:outline-ink lg:w-auto"
                        >
                          Details<span className="sr-only"> about {service.name.toLowerCase()}</span>
                        </ButtonLink>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </Carousel>
        </div>
      </div>
    </section>
  );
}
