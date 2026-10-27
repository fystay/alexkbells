import { whyKettlebells } from "@/content/home";
import { Section, SectionHeading, type SectionTone } from "@/components/ui/Section";
import { revealDelay } from "@/lib/reveal";

/**
 * Why kettlebells: the four benefits numbered 01-04 in a two-by-two grid inside
 * a kettlebell drawn in thin ink (owner, 2026-10-27: a line handle on a round
 * bell; was a framed box, option C, and before that plain text), heading left
 * of it from lg. No photo (Alex, WhatsApp 21 Oct 2026: "I don't want
 * too many pictures kicking about everywhere"). On the home page after what's
 * on offer, in the order Alex asked for (15 Oct 2026: where and how to book,
 * what I offer, why kettlebells and benefits, about me), and on /about.
 */
export function WhyKettlebells({ tone = "plain" }: { tone?: SectionTone }) {
  return (
    <Section tone={tone} id="why-kettlebells" labelledBy="why-heading">
      <div className="lg:grid lg:grid-cols-12 lg:gap-x-14">
        <SectionHeading id="why-heading" className="lg:col-span-5" eyebrow="Why kettlebells" title="One tool. A lot of training." />
        {/* Shaped like a kettlebell (owner, 2026-10-27): a line-drawn handle on a round bell that holds the four. */}
        <div className="mx-auto mt-8 w-full max-w-[30rem] lg:col-span-7 lg:mt-0 lg:max-w-[28rem]">
          <svg aria-hidden="true" viewBox="0 0 200 64" className="relative z-10 mx-auto -mb-px block h-auto w-[54%] text-ink">
            <path
              d="M18 64 V42 A38 38 0 0 1 56 4 H144 A38 38 0 0 1 182 42 V64 M42 64 V46 A20 20 0 0 1 62 26 H138 A20 20 0 0 1 158 46 V64"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              vectorEffect="non-scaling-stroke"
              strokeLinejoin="round"
            />
          </svg>
          <ul className="grid grid-cols-2 overflow-hidden rounded-[44%_44%_40%_40%/30%_30%_34%_34%] border-[1.5px] border-ink">
            {whyKettlebells.map((b, i) => (
              <li
                key={b.title}
                data-reveal
                style={revealDelay(i)}
                className="border-line px-4 py-5 sm:px-6 [&:nth-child(-n+2)]:pt-12 [&:nth-child(n+3)]:border-t [&:nth-child(n+3)]:pb-14 lg:[&:nth-child(-n+2)]:pt-16 lg:[&:nth-child(n+3)]:pb-20 [&:nth-child(odd)]:border-r [&:nth-child(odd)]:pl-7 [&:nth-child(even)]:pr-7 sm:[&:nth-child(odd)]:pl-10 sm:[&:nth-child(even)]:pr-10"
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
      </div>
    </Section>
  );
}
