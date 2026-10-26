import type { ReactNode } from "react";
import { faq } from "@/content/faq";
import { firstClassSteps as steps, hero } from "@/content/home";
import { formatAddressLines, mapsUrl } from "@/content/site";
import { getPrimaryCtaFor } from "@/lib/booking";
import { StartTraining } from "@/components/ui/StartTraining";
import { getService } from "@/content/services";
import { isPublishable, publishable } from "@/lib/publish";
import { ClassTimes, classFacts } from "./ClassTimes";

/** A step line, shown only while the FAQ answer it restates is confirmed. */
function confirmed(id: "beginners" | "first-session" | "bring", text: string): string | null {
  const item = faq.find((f) => f.id === id);
  return item && isPublishable(item.status) ? text : null;
}

/**
 * In the swipe layout each step is a slide (phones and tablets): an outlined
 * panel, most of the screen wide, snapping into place, with the number above
 * the title so the text has the full width. From lg it's the stacked step.
 */
function Step({ n, title, children, slide, footer }: { n: number; title: string; children: ReactNode; slide: boolean; footer?: ReactNode }) {
  const number = (
    <span aria-hidden="true" className="inline-flex size-7 items-center justify-center rounded-full border-[1.5px] border-ink text-sm font-bold">
      {n}
    </span>
  );
  const body = <div className="mt-1 space-y-2 text-sm leading-relaxed sm:text-base">{children}</div>;
  if (!slide) {
    return (
      <li className="grid grid-cols-[2.5rem_1fr] items-start">
        {number}
        <div className="min-w-0">
          <h3 className="card-title">{title}</h3>
          {body}
        </div>
      </li>
    );
  }
  return (
    <li className="flex w-[85%] max-w-sm shrink-0 snap-start flex-col rounded-2xl border border-line p-5 lg:grid lg:w-auto lg:max-w-none lg:grid-cols-[2.5rem_1fr] lg:items-start lg:rounded-none lg:border-0 lg:p-0">
      {number}
      <div className="mt-3 flex min-w-0 flex-1 flex-col lg:mt-0">
        <h3 className="card-title">{title}</h3>
        {body}
        {footer ? <div className="mt-auto pt-6 lg:hidden">{footer}</div> : null}
      </div>
    </li>
  );
}

/**
 * How to come to a class, in three steps (option 1 of the card overhaul,
 * owner 2026-10-26): pick a class (length, level, times), book your place
 * (price, and what to say if you're new), turn up and train (address and
 * directions, what happens, what to bring), then Book now. Replaces the
 * timetable cards, the address card and "Your first class" with the same
 * information and no cards. Goes inside the #classes section.
 * swipe (home, owner 2026-10-26): on phones and tablets the three steps are
 * slides in a sideways row (the next one peeks in; the row takes keyboard
 * focus, so arrow keys move through it), with Book now inside "Book your
 * place"; from lg they stack as on /classes, Book now below. The row is `relative` so screen-reader-only text in an
 * off-screen slide is positioned inside it rather than widening the page.
 * Slides share one height (the tallest), so the row reads as a set.
 */
export function JoinSteps({
  className,
  paymentNote,
  swipe = false,
}: {
  className?: string;
  /** Extra line under the price (e.g. /classes: how to pay). */
  paymentNote?: ReactNode;
  /** The steps as swipeable slides on phones and tablets (home). */
  swipe?: boolean;
}) {
  const cta = getPrimaryCtaFor("group-class");
  // The membership figures are in the plans straight below, so only the class price here.
  const price = publishable(getService("group-classes").prices)[0];
  const beginners = confirmed("beginners", steps.beginners);
  const firstSession = confirmed("first-session", steps.firstSession);
  const bring = confirmed("bring", steps.bring);
  const book = (className: string) => (
    <StartTraining href={cta.href} label={cta.kind === "booking" ? hero.primaryLabel : cta.label} external={cta.external} className={className} />
  );
  return (
    <div className={className}>
      <ol
        aria-label={swipe ? "Three steps, swipe for the next" : undefined}
        tabIndex={swipe ? 0 : undefined}
        className={
          swipe
            ? "no-scrollbar relative -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink sm:-mx-6 sm:scroll-px-6 sm:px-6 lg:mx-0 lg:block lg:space-y-6 lg:overflow-visible lg:px-0"
            : "space-y-6"
        }
      >
        <Step n={1} title={steps.pick} slide={swipe}>
          <p>{classFacts()}</p>
          <ClassTimes showPrice={false} className="pt-1 text-base" />
        </Step>
        <Step n={2} title={steps.book} slide={swipe} footer={swipe ? book("w-full") : undefined}>
          {price ? <p>£{price.amountGbp} a class, or save with a membership.</p> : null}
          {paymentNote ? <p>{paymentNote}</p> : null}
          {beginners ? <p>{beginners}</p> : null}
        </Step>
        <Step n={3} title={steps.turnUp} slide={swipe}>
          <div>
            <address className="not-italic">{formatAddressLines().join(", ")}</address>
            <a href={mapsUrl()} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center font-semibold underline underline-offset-4 hover:no-underline">
              Get directions<span className="sr-only"> (opens in a new tab)</span>
            </a>
          </div>
          {firstSession ? <p>{firstSession}</p> : null}
          {bring ? <p>{bring}</p> : null}
        </Step>
      </ol>
      {/* In the swipe layout, Book now sits in "Book your place" on phones and tablets; below the steps from lg. */}
      {swipe ? <div className="mt-8 hidden lg:block">{book("px-10")}</div> : book("mt-8 w-full sm:w-auto sm:px-10")}
    </div>
  );
}
