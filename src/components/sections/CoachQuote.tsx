import { aboutQuote } from "@/content/about";
import { timetable } from "@/content/classes";
import { coach } from "@/content/coach";
import { hero } from "@/content/home";
import { getService } from "@/content/services";
import { getPrimaryCtaFor } from "@/lib/booking";
import { isPublishable, publishable } from "@/lib/publish";
import { Section, type SectionTone } from "@/components/ui/Section";
import { StartTraining } from "@/components/ui/StartTraining";

/**
 * Alex's line in his own words, the class facts and Book now (owner's pick C,
 * 2026-10-26; boxes removed the same day: the quote stands on the page, the
 * facts sit in one row between thin rules; owner's /about design 2026-10-28). No photo: his before-and-after is
 * further down /about. Each fact shows only when its content is confirmed.
 */
export function CoachQuote({ tone = "white" }: { tone?: SectionTone }) {
  if (!aboutQuote || !isPublishable(aboutQuote.status)) return null;
  const sessions = isPublishable(timetable.status) ? timetable.sessions.length : 0;
  const price = publishable(getService("group-classes").prices)[0];
  const facts = [
    sessions ? { value: String(sessions), label: sessions === 1 ? "class a week" : "classes a week" } : null,
    // "Suitable for all experience levels" (Alex's class listing, content/classes.ts).
    { value: "All", label: "levels welcome" },
    price ? { value: `£${price.amountGbp}`, label: "a class" } : null,
  ].filter((f) => f !== null);
  const cta = getPrimaryCtaFor("group-class");

  return (
    <Section tone={tone} id="story" labelledBy="story-heading">
      <div className="max-w-2xl">
        {/* Owner's /about design (2026-10-28): a visible label, the quote, "Alex Robertson, coach", the facts in thirds between rules. */}
        <h2 id="story-heading" className="eyebrow">
          In {coach.name.split(" ")[0]}&apos;s words
        </h2>
        <figure data-reveal className="mt-5">
          <blockquote className="font-display text-[clamp(1.5rem,6.4vw,2rem)] leading-[1.25] font-medium tracking-tight text-balance">
            <p>&ldquo;{aboutQuote.text}&rdquo;</p>
          </blockquote>
          <figcaption className="mt-4 text-sm">{coach.name}, coach</figcaption>
        </figure>
        <ul aria-label="Classes at a glance" className="mt-6 grid grid-cols-3 border-y border-line">
          {facts.map((f) => (
            <li key={f.label} className="flex min-w-0 flex-col gap-0.5 py-4 pr-2.5 [&+&]:border-l [&+&]:border-line [&+&]:pl-3.5">
              <span className="font-display text-[1.625rem] leading-tight font-bold tabular-nums">{f.value}</span>
              <span className="text-sm leading-snug">{f.label}</span>
            </li>
          ))}
        </ul>
        <StartTraining href={cta.href} label={cta.kind === "booking" ? hero.primaryLabel : cta.label} external={cta.external} className="mt-7 w-full sm:w-auto sm:px-10" />
      </div>
    </Section>
  );
}
