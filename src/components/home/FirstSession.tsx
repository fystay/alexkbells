import { faq } from "@/content/faq";
import { isPublishable } from "@/lib/publish";
import { Section, SectionHeading } from "@/components/ui/Section";

const IDS = ["beginners", "first-session", "bring"] as const;

/**
 * "Your first class": the three questions a beginner asks before booking,
 * answered from the FAQ (content/faq.ts, confirmed), so nothing is said
 * twice in different words. Sits right after the timetable (second pass,
 * 2026-10-26).
 */
export function FirstSession() {
  const items = IDS.map((id) => faq.find((f) => f.id === id)).filter((f) => f && isPublishable(f.status));
  if (items.length === 0) return null;
  return (
    <Section id="first-class" labelledBy="first-class-heading">
      <div className="lg:grid lg:grid-cols-12 lg:gap-x-14">
        <SectionHeading id="first-class-heading" className="lg:col-span-5" title="Your first class." />
        <dl className="mt-8 grid grid-cols-1 gap-3 lg:col-span-7 lg:mt-0">
          {items.map((f) =>
            f ? (
              <div key={f.id} className="card px-5 py-5 sm:px-6">
                <dt className="card-title">{f.question}</dt>
                <dd className="mt-1.5">{f.answer}</dd>
              </div>
            ) : null,
          )}
        </dl>
      </div>
    </Section>
  );
}
