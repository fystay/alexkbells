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

function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <li className="grid grid-cols-[2.5rem_1fr] items-start">
      <span aria-hidden="true" className="inline-flex size-7 items-center justify-center rounded-full border-[1.5px] border-ink text-sm font-bold">
        {n}
      </span>
      <div>
        <h3 className="card-title">{title}</h3>
        <div className="mt-1 space-y-2 text-sm leading-relaxed sm:text-base">{children}</div>
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
 */
export function JoinSteps({ className }: { className?: string }) {
  const cta = getPrimaryCtaFor("group-class");
  // The membership figures are in the plans straight below, so only the class price here.
  const price = publishable(getService("group-classes").prices)[0];
  const beginners = confirmed("beginners", steps.beginners);
  const firstSession = confirmed("first-session", steps.firstSession);
  const bring = confirmed("bring", steps.bring);
  return (
    <div className={className}>
      <ol className="space-y-6">
        <Step n={1} title={steps.pick}>
          <p>{classFacts()}</p>
          <ClassTimes showPrice={false} className="pt-1 text-base" />
        </Step>
        <Step n={2} title={steps.book}>
          {price ? <p>£{price.amountGbp} a class, or save with a membership.</p> : null}
          {beginners ? <p>{beginners}</p> : null}
        </Step>
        <Step n={3} title={steps.turnUp}>
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
      <StartTraining href={cta.href} label={cta.kind === "booking" ? hero.primaryLabel : cta.label} external={cta.external} className="mt-8 w-full sm:w-auto sm:px-10" />
    </div>
  );
}
