import { useEffect, useRef, useState } from "react";
import { site } from "@/content/site";
import { getService } from "@/content/services";
import type { Service } from "@/content/types";
import { PRIMARY_CTA } from "@/lib/booking";
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
 *
 * On small screens this renders as a horizontal swipe carousel: one card is
 * mostly visible (≈85% width) with the next card peeking in. Smooth touch
 * scrolling, pagination dots and optional arrow controls encourage swiping.
 * Desktop keeps the existing three-column grid.
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

  const containerRef = useRef<HTMLUListElement | null>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Observe which card is most visible to update pagination.
    const items = Array.from(el.querySelectorAll("[data-carousel-item]")) as HTMLElement[];
    if (items.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Choose the item with the largest intersection ratio
        let maxRatio = 0;
        let maxIndex = 0;
        entries.forEach((entry) => {
          const idx = Number((entry.target as HTMLElement).dataset.index);
          if (entry.intersectionRatio > maxRatio) {
            maxRatio = entry.intersectionRatio;
            maxIndex = idx;
          }
        });
        setActive(maxIndex);
      },
      {
        root: el,
        threshold: [0, 0.25, 0.5, 0.75, 1],
      }
    );

    items.forEach((it) => observer.observe(it));
    return () => observer.disconnect();
  }, []);

  const scrollTo = (index: number) => {
    const el = containerRef.current;
    if (!el) return;
    const target = el.querySelector<HTMLElement>(`[data-index=\"${index}\"]`);
    if (!target) return;
    el.scrollTo({ left: target.offsetLeft - parseInt(getComputedStyle(el).paddingLeft || "0", 10), behavior: "smooth" });
  };

  const next = () => scrollTo(Math.min(active + 1, options.length - 1));
  const prev = () => scrollTo(Math.max(active - 1, 0));

  return (
    <section id="ways-to-train" aria-labelledby="ways-heading">
      <div className="bg-paper pt-5 pb-10 text-ink sm:pt-7 sm:pb-12 lg:pt-9 lg:pb-16">
        <div className="container-page">
          <SectionHeading
            id="ways-heading"
            eyebrow="What I offer"
            title="Choose how you train"
            intro={`Three ways to train with Alex: coached group classes and one-to-one sessions in ${site.location.town}, or online coaching wherever you are.`}
          />
        </div>
      </div>

      <div className="bg-ink py-10 text-paper sm:py-12 lg:py-16">
        <div className="container-page">
          {/*
            Carousel / grid container
            - On small screens: horizontal scroll with snap, showing ~85% width cards
            - On large screens (lg): fall back to the existing 3-column grid
          */}
          <ul
            ref={containerRef}
            className={`relative -mx-4 flex gap-6 overflow-x-auto px-4 py-6 scroll-px-4 touch-pan-x smooth-scroll snap-x snap-mandatory border-t border-line-inverse lg:grid lg:grid-cols-3 lg:gap-0 lg:overflow-visible lg:px-0 lg:py-0 lg:border-t-0`}
            // Inline styles for smooth mobile touch experience and to avoid depending on Tailwind plugins
            style={{ WebkitOverflowScrolling: "touch", scrollBehavior: "smooth" }}
            role="list"
          >
            {options.map(({ service, tagline, timetable: showTimes }, i) => (
              <li
                key={service.id}
                // data attributes for the observer
                data-carousel-item
                data-index={i}
                className={`min-w-[85vw] max-w-[85vw] snap-start flex-shrink-0 rounded-sm border border-line-inverse bg-ink px-6 py-8 lg:min-w-0 lg:max-w-none lg:flex lg:flex-col lg:border-0 lg:px-8 lg:py-2 lg:rounded-none lg:bg-transparent lg:row-span-1 ${
                  // keep consistent height on mobile so cards don't jump
                  "h-[420px] lg:h-auto"
                }`}
                aria-label={`${service.name} option`}
              >
                <div className="flex h-full flex-col">
                  <div>
                    <p className="eyebrow text-muted-inverse" aria-hidden="true">
                      {String(i + 1).padStart(2, "0")}
                    </p>
                    <h3 className="mt-4 font-display text-h3">
                      <KeepHyphens>{service.name}</KeepHyphens>
                    </h3>
                    <p className="mt-3 text-muted-inverse">{tagline}</p>
                    {showTimes ? (
                      <div className="mt-5">
                        <Timetable tone="ink" layout="stack" />
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-6 lg:mt-auto lg:pt-7">
                    <PriceList prices={service.prices} tone="ink" linkContact={false} />
                    <div className="mt-5 flex flex-col gap-3 sm:mt-6 sm:flex-row sm:items-center sm:gap-x-6 sm:gap-y-2">
                      <ButtonLink href={PRIMARY_CTA.href} tone="dark" className="w-full sm:w-auto">
                        {PRIMARY_CTA.label}
                        <span className="sr-only"> with {service.name.toLowerCase()}</span>
                      </ButtonLink>
                      <ButtonLink href={service.href} variant="text" tone="dark" className="w-full justify-center sm:w-auto sm:justify-start">
                        Details<span className="sr-only"> about {service.name.toLowerCase()}</span>
                      </ButtonLink>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>

          {/* Pagination and arrow controls - visible only on small screens */}
          <div className="mt-4 flex items-center justify-center gap-3 lg:hidden">
            <button
              type="button"
              onClick={prev}
              aria-label="Previous option"
              className="rounded-full border border-line-inverse bg-ink/60 p-2 text-paper/90"
            >
              ‹
            </button>

            <div className="flex gap-2">
              {options.map((o, i) => (
                <button
                  key={o.service.id}
                  type="button"
                  aria-label={`Show ${o.service.name}`}
                  aria-current={i === active ? "true" : undefined}
                  onClick={() => scrollTo(i)}
                  className={`h-2 w-8 rounded-full ${i === active ? "bg-paper" : "bg-paper/30"}`}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={next}
              aria-label="Next option"
              className="rounded-full border border-line-inverse bg-ink/60 p-2 text-paper/90"
            >
              ›
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
