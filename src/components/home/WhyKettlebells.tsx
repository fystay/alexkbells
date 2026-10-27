import { whyKettlebells } from "@/content/home";
import { Section, SectionHeading, type SectionTone } from "@/components/ui/Section";
import { revealDelay } from "@/lib/reveal";

/**
 * Why kettlebells: the four benefits in a two-by-two grid of plain text, no
 * cards or numbers (option 1 of the card overhaul, owner 2026-10-26), heading
 * left of them from lg. No photo (Alex, WhatsApp 21 Oct 2026: "I don't want
 * too many pictures kicking about everywhere"). On the home page after what's
 * on offer, in the order Alex asked for (15 Oct 2026: where and how to book,
 * what I offer, why kettlebells and benefits, about me), and on /about.
 */
export function WhyKettlebells({ tone = "plain" }: { tone?: SectionTone }) {
  return (
    <Section tone={tone} id="why-kettlebells" labelledBy="why-heading">
      <div className="lg:grid lg:grid-cols-12 lg:gap-x-14">
        <SectionHeading id="why-heading" className="lg:col-span-5" eyebrow="Why kettlebells" title="One tool. A lot of training." />
        <ul className="mt-6 grid grid-cols-2 gap-x-4 gap-y-5 lg:col-span-7 lg:mt-0 lg:gap-x-10">
          {whyKettlebells.map((b, i) => (
            <li key={b.title} data-reveal style={revealDelay(i)}>
              <h3 className="font-semibold leading-snug">{b.title}</h3>
              <p className="mt-0.5 text-[0.9375rem] lg:text-base">{b.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </Section>
  );
}
