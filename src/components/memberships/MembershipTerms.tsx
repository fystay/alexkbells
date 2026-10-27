import { membershipTerms } from "@/content/policy";
import { getService } from "@/content/services";
import { Section, SectionHeading } from "@/components/ui/Section";
import { MembershipExplainer } from "@/components/memberships/MembershipExplainer";
import { revealDelay } from "@/lib/reveal";

/** How memberships work: Alex's five terms, as rows between thin rules (no cards, 2026-10-26). */
export function MembershipTerms() {
  return (
    <Section id="how-it-works" labelledBy="terms-heading">
      <SectionHeading id="terms-heading" eyebrow="Memberships" title="How memberships work" />
      <div className="mt-8">
        <MembershipExplainer terms={membershipTerms} extraClassPrice={`£${getService("group-classes").prices[0].amountGbp}`} />
      </div>
      {/* The animation above is decorative; this list is the accessible text of the five terms. */}
      <ol className="rule-list sr-only">
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
