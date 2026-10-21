import { timetable } from "@/content/classes";
import { getService } from "@/content/services";
import { site } from "@/content/site";
import { getPrimaryCta } from "@/lib/booking";
import { isPublishable, publishable } from "@/lib/publish";
import { formatGbp, groupedSessions } from "@/lib/schedule";
import { StartTraining } from "@/components/ui/StartTraining";
import { Section } from "@/components/ui/Section";
import { KeepHyphens } from "@/components/ui/KeepHyphens";
import { cn } from "@/lib/cn";

const COLS: Record<number, string> = { 1: "grid-cols-1", 2: "grid-cols-2", 3: "grid-cols-3", 4: "grid-cols-4" };

interface CtaBandProps {
  title?: string;
  /** Second line of the headline, set in the muted colour. */
  titleSecondary?: string;
  body?: string;
  headingId?: string;
  /** The band's surface. Black by default; cream where the section above is dark. */
  tone?: "paper" | "ink";
}

/**
 * Closing call to action: the headline, the facts people want right before
 * they decide (class times and the class price, from the confirmed timetable
 * and prices), one "Book now" button, and Instagram as a quieter text link.
 * Nothing here books anything: the button opens the booking request flow.
 */
export function CtaBand({
  title = "Train with purpose.",
  titleSecondary = "Build with discipline.",
  body,
  headingId = "cta-heading",
  tone = "ink",
}: CtaBandProps) {
  const { instagram } = site.social;
  const cta = getPrimaryCta();
  const times = isPublishable(timetable.status) ? groupedSessions(timetable.sessions) : [];
  const price = publishable(getService("group-classes").prices)[0];
  const facts = [
    ...times.map((t) => ({ label: t.days, value: t.time })),
    ...(price ? [{ label: "Class", value: formatGbp(price.amountGbp) }] : []),
  ];
  const dark = tone === "ink";
  const muted = dark ? "text-muted-inverse" : "text-muted";
  const rule = dark ? "border-line-inverse" : "border-ink";

  return (
    <Section tone={tone} labelledBy={headingId}>
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-end lg:gap-16">
        <div data-reveal className="lg:col-span-7">
          <p className={cn("eyebrow mb-5", muted)}>{site.themes.join(" · ")}</p>
          <h2 id={headingId} className="font-display text-display text-balance">
            <KeepHyphens>{title}</KeepHyphens>
            {titleSecondary ? <span className={cn("mt-1 block", muted)}>{titleSecondary}</span> : null}
          </h2>
          {body ? <p className={cn("mt-6 max-w-xl text-lede", muted)}>{body}</p> : null}
        </div>
        <div data-reveal className="lg:col-span-5">
          {facts.length > 0 ? (
            <dl aria-label="Group classes" className={cn("grid border-y", rule, COLS[facts.length] ?? "grid-cols-2")}>
              {facts.map((f, i) => (
                <div key={f.label} className={cn(i > 0 ? cn("border-l py-4 pl-3 sm:pl-5", rule) : "py-4 pr-3")}>
                  <dt className={cn("eyebrow", muted)}>{f.label}</dt>
                  <dd className="mt-1 font-display text-lg whitespace-nowrap sm:text-xl">{f.value}</dd>
                </div>
              ))}
            </dl>
          ) : null}
          <StartTraining href={cta.href} label={cta.label} external={cta.external} tone={dark ? "dark" : "light"} className="mt-7 w-full" />
          <a
            href={instagram.url}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "group mt-4 inline-flex min-h-11 items-center gap-2 text-sm font-semibold uppercase tracking-[0.08em]",
              dark ? "focus-visible:outline-paper" : "focus-visible:outline-ink",
            )}
          >
            <span className={cn("underline underline-offset-[6px]", dark ? "decoration-muted-inverse group-hover:decoration-paper" : "decoration-muted group-hover:decoration-ink")}>
              Message on Instagram
            </span>
            <span aria-hidden="true">↗</span>
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        </div>
      </div>
    </Section>
  );
}
