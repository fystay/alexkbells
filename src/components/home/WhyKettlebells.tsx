import { whyKettlebells } from "@/content/home";
import { Section, SectionHeading, type SectionTone } from "@/components/ui/Section";
import { KettlebellPicker } from "./KettlebellPicker";

/**
 * Why kettlebells (owner's design, 2026-10-28): the four reasons inside a
 * line-drawn kettlebell; tap a quarter to see how the classes train it.
 * Heading left of it from lg. No photo (Alex, WhatsApp 21 Oct 2026). On the
 * home page under the hero (owner's fixed order, AGENTS.md).
 */
export function WhyKettlebells({ tone = "plain" }: { tone?: SectionTone }) {
  return (
    <Section tone={tone} id="why-kettlebells" labelledBy="why-heading">
      <div className="lg:grid lg:grid-cols-12 lg:gap-x-14">
        <SectionHeading id="why-heading" className="lg:col-span-5" eyebrow="Why kettlebells" title="One tool. A lot of training." />
        <KettlebellPicker items={whyKettlebells} className="mx-auto mt-8 w-full max-w-[30rem] lg:col-span-7 lg:mt-0 lg:max-w-[28rem]" />
      </div>
    </Section>
  );
}
