import { whyKettlebells } from "@/content/home";
import { Section } from "@/components/ui/Section";
import { revealDelay } from "@/lib/reveal";

/**
 * What the classes build, straight under the hero: three big words, each with
 * its one line from the home page's Why kettlebells (content/home.ts), set
 * as bullets, no rules between them. Replaces the single sentence that sat under the hero
 * (owner, 2026-10-27: it didn't look like it belonged).
 */
export function ClassFocus() {
  const focus = whyKettlebells.slice(0, 3);
  return (
    <Section spacing="compact" labelledBy="focus-heading" className="pb-0 sm:pb-0">
      <h2 id="focus-heading" className="sr-only">
        What the classes build
      </h2>
      <ul className="bullets sm:grid sm:list-none sm:grid-cols-3 sm:gap-x-12 sm:pl-0 sm:[&>li]:pl-0 sm:[&>li+li]:mt-0">
        {focus.map((f, i) => (
          <li key={f.title} data-reveal style={revealDelay(i)} >
            <p className="font-display text-h3 sm:text-[clamp(1.5rem,0.9rem+1.6vw,2.25rem)] sm:leading-[1.1]">{f.title}</p>
            <p className="mt-2 text-[0.9375rem] lg:text-base">{f.body}</p>
          </li>
        ))}
      </ul>
    </Section>
  );
}
