import Link from "next/link";
import { getService } from "@/content/services";
import { timetable } from "@/content/classes";
import type { Service } from "@/content/types";
import { getBookingAction, getOnlineCoachingAction, type CallToAction } from "@/lib/booking";
import { isPublishable } from "@/lib/publish";
import { describeTimetable } from "@/lib/schedule";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { KeepHyphens } from "@/components/ui/KeepHyphens";
import { Section } from "@/components/ui/Section";
import { PriceList } from "./PriceList";

interface Option {
  service: Service;
  tagline: string;
  detail?: string;
  action: CallToAction;
}

/**
 * "What I offer": the three ways to train side by side, each with its price
 * and its own booking button. One place to compare and choose.
 */
export function WaysToTrain() {
  const timesPublished = isPublishable(timetable.status);
  const options: Option[] = [
    {
      service: getService("group-classes"),
      tagline: "Coached group sessions at Media House, Cumbernauld. Beginners welcome.",
      detail: timesPublished ? describeTimetable(timetable.sessions) : undefined,
      action: getBookingAction("group-class"),
    },
    {
      service: getService("one-to-one"),
      tagline: "Face-to-face coaching, built around you.",
      action: getBookingAction("one-to-one"),
    },
    {
      service: getService("online-coaching"),
      tagline: "Personalised programming and support, wherever you train.",
      action: getOnlineCoachingAction(),
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
        {options.map(({ service, tagline, detail, action }, i) => (
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
            {detail ? <p className="mt-2 text-sm font-semibold">{detail}</p> : null}
            <div className="mt-8 lg:mt-auto lg:pt-8">
              <PriceList prices={service.prices} tone="ink" />
              <div className="mt-6 flex flex-col items-start gap-2">
                <ButtonLink href={action.href} external={action.external} tone="dark">
                  {action.label}
                </ButtonLink>
                <Link
                  href={service.href}
                  className="inline-flex min-h-11 items-center text-sm font-semibold underline-offset-[6px] hover:underline"
                >
                  Details<span className="sr-only"> about {service.name.toLowerCase()}</span>
                </Link>
              </div>
            </div>
          </li>
        ))}
      </ul>

    </Section>
  );
}
