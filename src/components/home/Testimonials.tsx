import { testimonials } from "@/content/community";
import { publishable } from "@/lib/publish";
import { Provisional } from "@/components/ui/Provisional";
import { Section, SectionHeading } from "@/components/ui/Section";

/** What members say. Renders nothing until a quote is confirmed (content/community.ts). */
export function Testimonials() {
  const quotes = publishable(testimonials);
  if (quotes.length === 0) return null;
  return (
    <Section labelledBy="members-heading">
      <SectionHeading id="members-heading" eyebrow="Members" title="In their words" />
      <ul className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        {quotes.map((t) => (
          <li key={t.quote}>
            <Provisional status={t.status}>
              <figure className="h-full rounded-lg border border-grey bg-white p-6">
                <blockquote className="text-lg">“{t.quote}”</blockquote>
                <figcaption className="eyebrow mt-4">{t.attribution}</figcaption>
              </figure>
            </Provisional>
          </li>
        ))}
      </ul>
    </Section>
  );
}
