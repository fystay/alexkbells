import { whyIntro, whyKettlebells } from "@/content/home";
import { Section, SectionHeading, type SectionTone } from "@/components/ui/Section";

/**
 * Why kettlebells, kept plain (Alex via the owner, 2026-10-29: "remove the
 * visual of the bell and keep it neat and simple"), in the words of his
 * mockup: a heading, one line, three short benefits. No photo (Alex,
 * WhatsApp 21 Oct 2026). Heading left of it from lg.
 */
export function WhyKettlebells({ tone = "plain" }: { tone?: SectionTone }) {
  return (
    <Section tone={tone} id="why-kettlebells" labelledBy="why-heading">
      <div className="lg:grid lg:grid-cols-12 lg:gap-x-14">
        <SectionHeading id="why-heading" className="lg:col-span-5" eyebrow="Why kettlebells" title={whyIntro.title} intro={whyIntro.body} />
        <ul className="mt-8 grid grid-cols-1 gap-3 lg:col-span-7 lg:mt-0">
          {whyKettlebells.map((w) => (
            <li key={w.title} data-reveal className="rounded-[1.25rem] bg-white px-5 py-5">
              <h3 className="card-title text-xl">{w.title}</h3>
              <p className="mt-1.5">{w.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </Section>
  );
}
