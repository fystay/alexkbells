import { testimonials } from "@/content/community";
import { publishable } from "@/lib/publish";
import { Provisional } from "@/components/ui/Provisional";
import { Section, SectionHeading } from "@/components/ui/Section";

/**
 * What members say. Renders nothing until a real quote is confirmed in
 * content/community.ts (never invented); then it appears on the home page
 * after Meet your coach, one white card per quote.
 */
export function Testimonials() {
  const quotes = publishable(testimonials);
  if (quotes.length === 0) return null;
  return (
    <Section labelledBy="members-heading">
      <SectionHeading id="members-heading" eyebrow="Members" title="In their words." />
      <ul className="mt-8 grid grid-cols-1 gap-3 md:grid-cols-3">
        {quotes.map((t) => (
          <li key={t.quote}>
            <Provisional status={t.status}>
              <figure className="card h-full p-6">
                <blockquote className="text-lg">“{t.quote}”</blockquote>
                <figcaption className="mt-4 text-sm font-semibold">{t.attribution}</figcaption>
              </figure>
            </Provisional>
          </li>
        ))}
      </ul>
    </Section>
  );
}
