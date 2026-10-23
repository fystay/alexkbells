import { whyKettlebells } from "@/content/home";
import { images } from "@/content/images";
import { PhotoFrame } from "@/components/ui/PhotoFrame";
import { Section, SectionHeading, type SectionTone } from "@/components/ui/Section";
import { revealDelay } from "@/lib/reveal";

/**
 * Option C (owner 2026-10-23): one photo from the class footage beside a
 * numbered list of the four benefits; the photo sits above the list on phones.
 */
export function WhyKettlebells({ tone = "plain" }: { tone?: SectionTone }) {
  return (
    <Section tone={tone} id="why-kettlebells" labelledBy="why-heading">
      <SectionHeading id="why-heading" eyebrow="Why kettlebells" title="One tool. A lot of training." />
      <div className="mt-8 grid grid-cols-1 gap-6 lg:mt-10 lg:grid-cols-2 lg:gap-14">
        <PhotoFrame photo={images.whyKettlebells} sizes="(min-width: 1024px) 45vw, 100vw" className="aspect-[4/3] w-full lg:aspect-[4/5]" />
        <ol className="flex flex-col border-t border-ink">
          {whyKettlebells.map((b, i) => (
            <li
              key={b.title}
              data-reveal
              style={revealDelay(i)}
              className="grid grid-cols-[2.75rem_1fr] items-baseline content-center border-b border-grey py-4 lg:flex-1 lg:grid-cols-[4.5rem_1fr] lg:py-5"
            >
              <span aria-hidden="true" className="font-display text-base lg:text-xl">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div>
                <h3 className="font-display text-h3">{b.title}</h3>
                <p className="mt-1.5">{b.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </Section>
  );
}
