import { whyKettlebells } from "@/content/home";
import { Section, SectionHeading } from "@/components/ui/Section";
import { revealDelay } from "@/lib/reveal";

/** Four short benefits in a quiet grid. Type only: no icons, no pictures. */
export function WhyKettlebells() {
  return (
    <Section tone="white" id="why-kettlebells" labelledBy="why-heading">
      <SectionHeading id="why-heading" eyebrow="Why kettlebells" title="One tool. A lot of training." />
      <ul className="mt-10 grid grid-cols-1 gap-x-8 gap-y-8 sm:grid-cols-2 lg:mt-14 lg:grid-cols-4">
        {whyKettlebells.map((b, i) => (
          <li key={b.title} data-reveal style={revealDelay(i)} className="border-t border-grey pt-4">
            <h3 className="font-display text-h3">{b.title}</h3>
            <p className="mt-2">{b.body}</p>
          </li>
        ))}
      </ul>
    </Section>
  );
}
