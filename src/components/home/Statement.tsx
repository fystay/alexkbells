import { pillars } from "@/content/about";
import { Section } from "@/components/ui/Section";
import { revealDelay } from "@/lib/reveal";

/** What the club is, in one paragraph and three words. Type only: no imagery. */
export function Statement() {
  return (
    <Section tone="paper" id="the-club" labelledBy="club-heading">
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:gap-16">
        <div data-reveal className="lg:col-span-6">
          <p className="eyebrow mb-4 text-muted">The club</p>
          <h2 id="club-heading" className="font-display text-h2 text-balance">
            Strength is built through consistency.
          </h2>
          <p className="mt-6 max-w-xl text-lede text-muted">
            RAENG is a kettlebell club in Cumbernauld, Glasgow. We train with purpose, learn good technique and build strength
            together, class after class.
          </p>
        </div>
        <ul className="grid grid-cols-1 gap-8 sm:grid-cols-3 lg:col-span-6 lg:gap-6">
          {pillars.map((p, i) => (
            <li key={p.title} data-reveal style={revealDelay(i)} className="border-t border-ink pt-4">
              <h3 className="font-display text-h3">{p.title}</h3>
              <p className="mt-3 text-sm text-muted">{p.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </Section>
  );
}
