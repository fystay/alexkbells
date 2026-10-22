import { whyKettlebells } from "@/content/home";
import { Section, SectionHeading } from "@/components/ui/Section";
import { revealDelay } from "@/lib/reveal";

/** Four short benefits in a quiet grid. Type only: no icons, no pictures. */
export function WhyKettlebells() {
  return (
    <Section tone="white" id="why-kettlebells" labelledBy="why-heading">
      <SectionHeading id="why-heading" eyebrow="Why kettlebells" title="One tool. A lot of training." />
      <ul className="mt-8 grid grid-cols-2 gap-x-5 gap-y-6 lg:mt-10 lg:grid-cols-4 lg:gap-x-8">
        {whyKettlebells.map((b, i) => (
          <li key={b.title} data-reveal style={revealDelay(i)} className="border-t border-grey pt-4">
            <h3 className="font-display text-base sm:text-h3">{b.title}</h3>
            <p className="mt-2 text-sm sm:text-base">{b.body}</p>
          </li>
        ))}
      </ul>
    </Section>
  );
}
