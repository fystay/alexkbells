import { membershipTerms } from "@/content/policy";
import { Section, SectionHeading } from "@/components/ui/Section";
import { revealDelay } from "@/lib/reveal";

/** How memberships work: Alex's five terms, as rows between thin rules (no cards, 2026-10-26). */
export function MembershipTerms() {
  return (
    <Section id="how-it-works" labelledBy="terms-heading">
      <SectionHeading id="terms-heading" eyebrow="Memberships" title="How memberships work" />
      <ol className="rule-list mt-8 max-w-2xl">
        {membershipTerms.map((term, i) => (
          <li key={term} data-reveal style={revealDelay(i)} className="rule-row grid grid-cols-[2rem_1fr] gap-x-3">
            <span className="font-semibold tabular-nums" aria-hidden="true">
              {i + 1}
            </span>
            <span>{term}</span>
          </li>
        ))}
      </ol>
    </Section>
  );
}
