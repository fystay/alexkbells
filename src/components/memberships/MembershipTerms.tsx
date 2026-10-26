import { membershipTerms } from "@/content/policy";
import { Section, SectionHeading } from "@/components/ui/Section";
import { revealDelay } from "@/lib/reveal";

/** How memberships work: five short lines, numbered, one white card each, in two columns from md. */
export function MembershipTerms() {
  return (
    <Section id="how-it-works" labelledBy="terms-heading">
      <SectionHeading id="terms-heading" eyebrow="Memberships" title="How memberships work" />
      <ol className="mt-10 grid grid-cols-1 gap-3 md:grid-cols-2">
        {membershipTerms.map((term, i) => (
          <li key={term} data-reveal style={revealDelay(i)} className="card grid grid-cols-[2rem_1fr] gap-x-3 px-5 py-5 sm:px-6">
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
