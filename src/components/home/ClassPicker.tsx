import Link from "next/link";
import { timetable } from "@/content/classes";
import { faq } from "@/content/faq";
import { firstClassSteps, hero } from "@/content/home";
import { getService } from "@/content/services";
import { formatAddressLines, mapsUrl } from "@/content/site";
import { getPrimaryCtaFor } from "@/lib/booking";
import { isPublishable, publishable } from "@/lib/publish";
import { formatTime, sortSessions } from "@/lib/schedule";
import { ChoiceCards, type Choice } from "@/components/ui/ChoiceCards";
import { ChoiceCover, choiceCard } from "@/components/ui/choice";

const SHORT_DAY: Record<string, string> = { Monday: "Mon", Tuesday: "Tue", Wednesday: "Wed", Thursday: "Thu", Friday: "Fri", Saturday: "Sat", Sunday: "Sun" };

/**
 * The home page's classes (owner's pick A, 2026-10-28): one tile per weekly
 * class (day, time), chosen like a plan; then one line of facts (price, level,
 * venue) and Book now, which opens the booking calendar on that class's next
 * date (`/book/group-class?class=<timetable id>`). The button always reads
 * "Book now" (owner rule); the chosen class is said under it. What happens at
 * the first session and what to bring live on /classes and in the FAQ.
 * Every figure comes from content.
 */
export function ClassPicker({ className }: { className?: string }) {
  const sessions = isPublishable(timetable.status) ? sortSessions(timetable.sessions) : [];
  const cta = getPrimaryCtaFor("group-class");
  const price = publishable(getService("group-classes").prices)[0];
  const beginners = faq.find((f) => f.id === "beginners");
  if (sessions.length === 0) return null;
  const label = cta.kind === "booking" ? hero.primaryLabel : cta.label;
  const choices: Choice[] = sessions.map((s) => ({
    value: s.id,
    label: `${s.day} ${formatTime(s.start)} class`,
    href: cta.kind === "booking" && !cta.external ? `${cta.href}?class=${s.id}` : cta.href,
    action: label,
    next: "Next, check the date and add your details.",
    external: cta.external,
  }));
  // The venue was too little on its own (owner, 2026-10-28): length in the facts, the full address with directions under them.
  const minutes = sessions[0]?.durationMinutes;
  const facts = [price ? `£${price.amountGbp} a class` : null, minutes ? `${minutes} minutes` : null, "All levels"].filter(Boolean);
  return (
    <div className={className}>
      <ChoiceCards name="class" legend="Choose a class" choices={choices} prompt="Tap a day to choose it.">
        <ul aria-label="Class times" className="grid grid-cols-3 gap-2 sm:gap-3">
          {sessions.map((s) => {
            const [time, period] = formatTime(s.start).split(" ");
            return (
              <li key={s.id} className={`${choiceCard} rounded-[1.25rem] border-[1.5px] border-ink px-1 py-4 text-center sm:py-5`}>
                <ChoiceCover name="class" value={s.id} label={`${s.day} ${formatTime(s.start)}`} />
                <span className="block text-[0.8125rem] font-semibold tracking-[0.2em] uppercase">{SHORT_DAY[s.day] ?? s.day}</span>
                <span className="mt-2 block font-display text-[1.625rem] leading-none tabular-nums sm:text-[2rem]">{time}</span>
                <span className="mt-1 block text-xs">{period}</span>
              </li>
            );
          })}
        </ul>
        <p className="mt-5 flex justify-between gap-3 border-t border-line pt-3 text-sm sm:text-[0.9375rem]">
          {facts.map((f) => (
            <span key={f}>{f}</span>
          ))}
        </p>
        <div className="mt-3 flex items-start justify-between gap-4 border-b border-line pb-3 text-sm sm:text-[0.9375rem]">
          <address className="not-italic">{formatAddressLines().join(", ")}</address>
          <a href={mapsUrl()} target="_blank" rel="noopener noreferrer" className="-my-3 inline-flex min-h-11 shrink-0 items-center font-semibold underline underline-offset-4 hover:no-underline">
            Directions<span className="sr-only"> (opens in a new tab)</span>
          </a>
        </div>
      </ChoiceCards>
      <p className="mt-1 text-[0.9375rem] lg:text-base">
        {beginners && isPublishable(beginners.status) ? `${firstClassSteps.beginners} ` : null}
        <Link href="#memberships" className="font-semibold underline underline-offset-4 hover:no-underline">
          Save with a membership
        </Link>
      </p>
    </div>
  );
}
