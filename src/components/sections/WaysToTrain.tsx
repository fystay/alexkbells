import Image from "next/image";
import { site } from "@/content/site";
import { getService } from "@/content/services";
import type { Photo, Service } from "@/content/types";
import { ENQUIRY_HREF } from "@/lib/booking";
import { cn } from "@/lib/cn";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Carousel } from "@/components/ui/Carousel";
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
 * The card photos reuse the site's existing training stills (nothing is
 * invented). There is no online-coaching photo yet, so that card shows the
 * single-bell hold. `position` keeps the person and bells in the landscape crop.
 */
const cardImages: Record<Service["id"], { photo: Photo | null; position: string }> = {
  "group-classes": { photo: site.pageImages.classes, position: "object-[50%_48%]" },
  "one-to-one": { photo: site.pageImages.coaching, position: "object-[50%_58%]" },
  "online-coaching": { photo: site.pageImages.contact, position: "object-[50%_8%]" },
};

/**
 * "What I offer". One landmark in two bands: the heading on paper, carrying on
 * from the hero, then the three ways to train on ink, each with a photo, a
 * short description, its price and an Enquire button.
 *
 * Below lg the cards are a swipe carousel (one card mostly in view, the next
 * peeking in; dots and arrows); from lg they are three columns. The cards are
 * the same height so nothing jumps while swiping.
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
          <Carousel
            label="Ways to train"
            slideLabels={options.map((o) => o.service.name)}
            itemClassName="lg:border-l lg:border-line-inverse lg:px-8 lg:first:border-l-0 lg:first:pl-0 lg:last:pr-0"
          >
            {options.map(({ service, tagline, timetable: showTimes }, i) => {
              const image = cardImages[service.id];
              return (
                <div
                  key={service.id}
                  className="flex w-full flex-col border border-line-inverse bg-ink-soft lg:border-0 lg:bg-transparent"
                >
                  {image.photo ? (
                    <Image
                      src={image.photo.src}
                      alt={image.photo.alt}
                      width={image.photo.width}
                      height={image.photo.height}
                      sizes="(min-width: 1024px) 30vw, (min-width: 640px) 24rem, 86vw"
                      className={cn("aspect-[16/10] w-full object-cover", image.position)}
                    />
                  ) : null}
                  <div className="flex flex-1 flex-col p-5 sm:p-6 lg:px-0 lg:pb-0">
                    <p className="eyebrow text-muted-inverse" aria-hidden="true">
                      {String(i + 1).padStart(2, "0")}
                    </p>
                    <h3 className="mt-3 font-display text-h3">
                      <KeepHyphens>{service.name}</KeepHyphens>
                    </h3>
                    <p className="mt-2 text-muted-inverse">{tagline}</p>
                    {showTimes ? (
                      <div className="mt-4">
                        <Timetable tone="ink" layout="compact" />
                      </div>
                    ) : null}
                    <div className="mt-auto pt-6">
                      <PriceList prices={service.prices} tone="ink" linkContact={false} />
                      <div className="mt-5 flex flex-col gap-1 lg:flex-row lg:items-center lg:gap-x-6">
                        <ButtonLink href={ENQUIRY_HREF} tone="dark" className="w-full lg:w-auto">
                          Enquire<span className="sr-only"> about {service.name.toLowerCase()}</span>
                        </ButtonLink>
                        <ButtonLink href={service.href} variant="text" tone="dark" className="w-full lg:w-auto">
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
