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
  /** One motivating line on who it suits. Every option is open to everybody: no fitness level, frequency or result is promised. */
  pitch: string;
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
 * "What I offer". One ink band, heading included, so it reads as a single
 * block after the paper hero. Each way to train is an open column rather than
 * a boxed card: a portrait photo with its number and name set over a fade at
 * the bottom, then a short description, its price and an Enquire button.
 *
 * Below lg the cards are a swipe carousel (one card mostly in view, the next
 * peeking in; dots and arrows); from lg they are three columns. The cards are
 * the same height so nothing jumps while swiping.
 */
export function WaysToTrain() {
  const options: Option[] = [
    {
      service: getService("group-classes"),
      pitch: "Feed off the energy of the room and push further together, whatever your starting point.",
      tagline: "Coached group sessions at Media House, Cumbernauld. Beginners welcome.",
      timetable: true,
    },
    {
      service: getService("one-to-one"),
      pitch: "Every rep coached and every session built around you, from your very first swing.",
      tagline: "Face-to-face sessions with Alex.",
    },
    {
      service: getService("online-coaching"),
      pitch: "Your plan, your schedule and Alex in your corner, wherever you train.",
      tagline: "Personalised programming and support, wherever you train.",
    },
  ];

  return (
    <section id="ways-to-train" aria-labelledby="ways-heading" className="bg-ink pt-10 pb-16 text-paper sm:py-20 lg:py-28">
      <div className="container-page">
        <div className="grid grid-cols-1 gap-5 border-b border-line-inverse pb-8 sm:pb-12 lg:grid-cols-12 lg:items-end lg:gap-8 lg:pb-14">
          <SectionHeading id="ways-heading" tone="ink" eyebrow="What I offer" title="Choose how you train" className="lg:col-span-7" />
          <p className="max-w-xl text-lede text-muted-inverse lg:col-span-5">
            Three ways to train with Alex: coached group classes and one-to-one sessions in {site.location.town}, or
            online coaching wherever you are.
          </p>
        </div>

        <div className="mt-8 sm:mt-12 lg:mt-14">
          <Carousel label="Ways to train" slideLabels={options.map((o) => o.service.name)}>
            {options.map(({ service, pitch, tagline, timetable: showTimes }, i) => {
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
                    <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
                      <p className="eyebrow text-paper/70" aria-hidden="true">
                        {String(i + 1).padStart(2, "0")}
                      </p>
                      <h3 className="mt-2 font-display text-h3">
                        <KeepHyphens>{service.name}</KeepHyphens>
                      </h3>
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col pt-5 sm:pt-6">
                    <p className="text-lg leading-snug font-semibold text-paper">{pitch}</p>
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
