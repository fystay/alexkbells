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
 * facts sit in one row between thin rules). No photo: his before-and-after is
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
        <h2 id="story-heading" className="sr-only">
          In {coach.name.split(" ")[0]}&apos;s words
        </h2>
        <figure data-reveal>
          <blockquote className="font-display text-[1.875rem] leading-[1.15] text-balance sm:text-[2.5rem]">
            <p>&ldquo;{aboutQuote.text}&rdquo;</p>
          </blockquote>
          <figcaption className="mt-5">
            <span className="block font-semibold">{coach.name}</span>
            <span className="block text-sm">{coach.role}</span>
          </figcaption>
        </figure>
        <ul aria-label="Classes at a glance" className="mt-8 grid grid-cols-3 text-center">
          {facts.map((f) => (
            <li key={f.label} className="px-1.5 py-2">
              <span className="block font-display text-[1.625rem] leading-tight">{f.value}</span>
              <span className="block text-[0.8125rem] leading-snug">{f.label}</span>
            </li>
          ))}
        </ul>
        <StartTraining href={cta.href} label={cta.kind === "booking" ? hero.primaryLabel : cta.label} external={cta.external} className="mt-7 w-full sm:w-auto sm:px-10" />
      </div>
    </Section>
  );
}
