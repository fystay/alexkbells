import { whyKettlebells } from "@/content/home";
import { Section, SectionHeading, type SectionTone } from "@/components/ui/Section";
import { revealDelay } from "@/lib/reveal";

/**
 * Why kettlebells: the four benefits numbered 01-04 in a two-by-two grid inside
 * one box with a thin ink edge and fine grey rules (owner, 2026-10-27, option
 * C; was plain text, 2026-10-26), heading left of them from lg. No photo (Alex, WhatsApp 21 Oct 2026: "I don't want
 * too many pictures kicking about everywhere"). On the home page after what's
 * on offer, in the order Alex asked for (15 Oct 2026: where and how to book,
 * what I offer, why kettlebells and benefits, about me), and on /about.
 */
export function WhyKettlebells({ tone = "plain" }: { tone?: SectionTone }) {
  return (
    <Section tone={tone} id="why-kettlebells" labelledBy="why-heading">
      <div className="lg:grid lg:grid-cols-12 lg:gap-x-14">
        <SectionHeading id="why-heading" className="lg:col-span-5" eyebrow="Why kettlebells" title="One tool. A lot of training." />
        <ul className="mt-6 grid grid-cols-2 overflow-hidden rounded-[1.75rem] border-[1.5px] border-ink lg:col-span-7 lg:mt-0">
          {whyKettlebells.map((b, i) => (
            <li
              key={b.title}
              data-reveal
              style={revealDelay(i)}
              className="border-line p-4 sm:p-6 [&:nth-child(n+3)]:border-t [&:nth-child(odd)]:border-r"
            >
              <p aria-hidden="true" className="mb-2 text-xs font-semibold tracking-[0.15em] tabular-nums">
                {String(i + 1).padStart(2, "0")}
              </p>
              <h3 className="font-semibold leading-snug">{b.title}</h3>
              <p className="mt-0.5 text-[0.9375rem] lg:text-base">{b.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </Section>
  );
}
