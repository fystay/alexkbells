import { membershipTerms } from "@/content/policy";
import { Section, SectionHeading } from "@/components/ui/Section";
import { revealDelay } from "@/lib/reveal";

/** How memberships work: five short lines, numbered, in two columns from md. */
export function MembershipTerms({ tone = "paper" }: { tone?: "paper" | "surface" }) {
  return (
    <Section tone={tone} id="how-it-works" labelledBy="terms-heading">
      <SectionHeading id="terms-heading" eyebrow="Memberships" title="How memberships work" />
      <ol className="mt-12 grid grid-cols-1 gap-x-12 gap-y-6 md:grid-cols-2">
        {membershipTerms.map((term, i) => (
          <li key={term} data-reveal style={revealDelay(i)} className="grid grid-cols-[2.5rem_1fr] gap-x-3 border-t border-ink pt-4">
            <span className="eyebrow pt-1 text-muted" aria-hidden="true">
              {String(i + 1).padStart(2, "0")}
            </span>
            <span>{term}</span>
          </li>
        ))}
      </ol>
    </Section>
  );
}
