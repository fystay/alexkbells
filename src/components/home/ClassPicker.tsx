import { timetable } from "@/content/classes";
import { faq } from "@/content/faq";
import { firstClassSteps, hero } from "@/content/home";
import { getService } from "@/content/services";
import { mapsUrl, site } from "@/content/site";
import { getPrimaryCtaFor } from "@/lib/booking";
import { isPublishable, publishable } from "@/lib/publish";
import { formatTime, sortSessions } from "@/lib/schedule";
import { ClassWeek, type WeekClass } from "./ClassWeek";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const COUNT = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven"];

/** "Three classes a week." from the confirmed timetable. */
export function classesTitle(): string {
  const n = isPublishable(timetable.status) ? timetable.sessions.length : 0;
  return n > 0 && n < COUNT.length ? `${COUNT[n]} ${n === 1 ? "class" : "classes"} a week.` : "Classes.";
}

/**
 * The home page's classes (owner's design, 2026-10-28; see ClassWeek): every
 * figure from content. Book now opens the calendar on the chosen class
 * (`/book/group-class?class=<timetable id>`) where booking is on.
 */
export function ClassPicker({ className }: { className?: string }) {
  const sessions = isPublishable(timetable.status) ? sortSessions(timetable.sessions) : [];
  if (sessions.length === 0) return null;
  const cta = getPrimaryCtaFor("group-class");
  const price = publishable(getService("group-classes").prices)[0];
  const beginners = faq.find((f) => f.id === "beginners");
  const minutes = sessions[0]?.durationMinutes;
  const classes: WeekClass[] = sessions.map((s) => {
    const [hours, m] = s.start.split(":").map(Number);
    return { id: s.id, day: s.day, dayIndex: DAYS.indexOf(s.day), start: hours * 60 + m, time: formatTime(s.start), durationMinutes: s.durationMinutes ?? 60 };
  });
  const bookable = cta.kind === "booking" && !cta.external;
  const l = site.location;
  return (
    <div className={className}>
      <ClassWeek
        classes={classes}
        facts={[price ? `£${price.amountGbp} a class` : null, minutes ? `${minutes} minutes` : null, "All levels"].filter((f): f is string => Boolean(f))}
        bookHref={cta.href}
        bookLabel={cta.kind === "booking" ? hero.primaryLabel : cta.label}
        external={cta.external}
        classHrefBase={bookable ? `${cta.href}?class=` : null}
        address={{ venue: l.venue, lines: [l.street, `${l.town}, ${l.city}`], postcode: l.postcode }}
        mapsHref={mapsUrl()}
        beginners={beginners && isPublishable(beginners.status) ? firstClassSteps.beginners : null}
      />
    </div>
  );
}
