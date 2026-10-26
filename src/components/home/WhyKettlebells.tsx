import { whyKettlebells } from "@/content/home";
import { Section, SectionHeading, type SectionTone } from "@/components/ui/Section";
import { revealDelay } from "@/lib/reveal";

/**
 * Why kettlebells: the four benefits as numbered white cards, heading left of
 * them from lg. No photo (Alex, WhatsApp 21 Oct 2026: "I don't want too many
 * pictures kicking about everywhere"). On the home page between what's on
 * offer and Meet your coach, in the order Alex asked for (15 Oct 2026: where
 * and how to book, what I offer, why kettlebells and benefits, about me), and
 * on /about.
 */
export function WhyKettlebells({ tone = "plain" }: { tone?: SectionTone }) {
  return (
    <Section tone={tone} id="why-kettlebells" labelledBy="why-heading">
      <div className="lg:grid lg:grid-cols-12 lg:gap-x-14">
        <SectionHeading id="why-heading" className="lg:col-span-5" eyebrow="Why kettlebells" title="One tool. A lot of training." />
        <ol className="mt-8 grid grid-cols-1 gap-3 lg:col-span-7 lg:mt-0">
          {whyKettlebells.map((b, i) => (
            <li key={b.title} data-reveal style={revealDelay(i)} className="card grid grid-cols-[2.25rem_1fr] items-baseline px-5 py-5 sm:px-6 lg:grid-cols-[3rem_1fr]">
              <span aria-hidden="true" className="card-title tabular-nums">
                {i + 1}
              </span>
              <div>
                <h3 className="card-title">{b.title}</h3>
                <p className="mt-1.5">{b.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </Section>
  );
}
