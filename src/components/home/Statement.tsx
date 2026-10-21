import { site } from "@/content/site";
import { Section } from "@/components/ui/Section";

/** What the club is: one heading, one paragraph, three words. Type only. */
export function Statement() {
  return (
    <Section id="the-club" labelledBy="club-heading" spacing="compact">
      <div data-reveal className="max-w-3xl">
        <p className="eyebrow mb-5 text-muted-inverse">{site.themes.join(" · ")}</p>
        <h2 id="club-heading" className="font-display text-h2 text-balance">
          Strength is built through consistency.
        </h2>
        <p className="mt-6 max-w-xl text-lede text-muted-inverse">
          RAENG is a kettlebell club in Cumbernauld, Glasgow. We train with purpose, learn good technique and build strength
          together, class after class.
        </p>
      </div>
    </Section>
  );
}
