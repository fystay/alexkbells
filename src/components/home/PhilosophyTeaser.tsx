import Link from "next/link";
import { philosophy } from "@/content/about";
import { Section, SectionHeading } from "@/components/ui/Section";

/**
 * RAENG's philosophy on the home page (Alex's layout, 2026-10-29): the title
 * and the first paragraph of the philosophy card, word for word, with a link to
 * the whole of it on About. No Thai face here (it is loaded on About only).
 */
export function PhilosophyTeaser() {
  return (
    <Section id="philosophy" labelledBy="philosophy-heading">
      <div className="lg:grid lg:grid-cols-12 lg:gap-x-14">
        <SectionHeading id="philosophy-heading" className="lg:col-span-5" eyebrow="RAENG philosophy" title={philosophy.title} />
        <div className="mt-6 lg:col-span-7 lg:mt-0">
          <p className="max-w-xl text-lede">{philosophy.paragraphs[0]}</p>
          <Link href="/about" className="mt-4 inline-flex min-h-11 items-center font-semibold underline underline-offset-4 hover:no-underline">
            Read more about RAENG
          </Link>
        </div>
      </div>
    </Section>
  );
}
