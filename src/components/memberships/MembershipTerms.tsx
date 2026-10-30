import { membershipCancellation, membershipTerms, membershipTermsAlex } from "@/content/policy";
import { getService } from "@/content/services";
import { Section, SectionHeading } from "@/components/ui/Section";
import { MembershipExplainer } from "@/components/memberships/MembershipExplainer";
import { revealDelay } from "@/lib/reveal";

/** How memberships work: Alex's five terms, as rows between thin rules (no cards, 2026-10-26). */
export function MembershipTerms() {
  return (
    <Section id="how-it-works" labelledBy="terms-heading">
      <SectionHeading id="terms-heading" title="The five terms" className="sr-only" />
      <div>
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
      {/* Alex's mockup (2026-10-29): the terms with a title each; this is what the home page's "Membership and cancellation policy" link opens. */}
      <div id="membership-terms" className="mt-12 max-w-2xl scroll-mt-24">
        <h2 className="font-display text-h2 text-balance">{membershipTermsAlex.title}</h2>
        <p className="mt-3 text-lede">{membershipTermsAlex.intro}</p>
        <ul className="lined mt-6">
          {membershipTermsAlex.items.map((item) => (
            <li key={item.title}>
              <h3 className="card-title">{item.title}</h3>
              <p className="mt-1">{item.body}</p>
            </li>
          ))}
          {/* Alex's "Membership cancellation" block was placeholder text (2026-10-29); the owner wrote how it works on 2026-10-30 (content/policy.ts). */}
          <li>
            <h3 className="card-title">{membershipCancellation.title}</h3>
            <div className="mt-1 space-y-2">
              {membershipCancellation.lines.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
          </li>
        </ul>
      </div>
    </Section>
  );
}
