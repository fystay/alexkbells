import Image from "next/image";
import { whyKettlebells } from "@/content/home";
import { images } from "@/content/images";
import { Section, SectionHeading } from "@/components/ui/Section";
import { revealDelay } from "@/lib/reveal";

/**
 * Four benefits as photo tiles (option A, owner 2026-10-23): a still from the
 * class footage for each, the words in white on the picture with a soft dark
 * shadow so they read on any frame. 2 × 2 on phones, four across from 1024 px.
 */
export function WhyKettlebells() {
  return (
    <Section id="why-kettlebells" labelledBy="why-heading">
      <SectionHeading id="why-heading" eyebrow="Why kettlebells" title="One tool. A lot of training." />
      <ul className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 lg:mt-10 lg:grid-cols-4 lg:gap-5">
        {whyKettlebells.map((b, i) => {
          const photo = images[b.image];
          return (
            <li key={b.title} data-reveal style={revealDelay(i)} className="relative aspect-[3/4] overflow-hidden rounded-lg bg-ink text-white">
              <Image
                src={photo.src}
                alt={photo.alt}
                fill
                sizes="(min-width: 1024px) 24vw, 46vw"
                className="object-cover"
                style={photo.position ? { objectPosition: photo.position } : undefined}
              />
              <div className="absolute inset-x-0 bottom-0 p-3 sm:p-4 [text-shadow:0_1px_3px_var(--color-ink),0_0_14px_var(--color-ink)]">
                <h3 className="font-display text-base leading-tight sm:text-h3">{b.title}</h3>
                <p className="mt-1 text-xs sm:text-sm">{b.body}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}
