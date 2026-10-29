import { whyKettlebells } from "@/content/home";
import { Section, SectionHeading, type SectionTone } from "@/components/ui/Section";

/**
 * Why kettlebells, kept plain (Alex via the owner, 2026-10-29: "remove the
 * visual of the bell and keep it neat and simple"): the four reasons as short
 * text. No photo (Alex, WhatsApp 21 Oct 2026). Heading left of it from lg.
 */
export function WhyKettlebells({ tone = "plain" }: { tone?: SectionTone }) {
  return (
    <Section tone={tone} id="why-kettlebells" labelledBy="why-heading">
      <div className="lg:grid lg:grid-cols-12 lg:gap-x-14">
        <SectionHeading id="why-heading" className="lg:col-span-5" eyebrow="Why kettlebells" title="One tool. A lot of training." />
        <ul className="mt-8 grid grid-cols-1 gap-x-10 gap-y-7 sm:grid-cols-2 lg:col-span-7 lg:mt-0">
          {whyKettlebells.map((w) => (
            <li key={w.title} data-reveal>
              <h3 className="card-title text-xl">{w.title}</h3>
              <p className="mt-1.5">{w.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </Section>
  );
}
