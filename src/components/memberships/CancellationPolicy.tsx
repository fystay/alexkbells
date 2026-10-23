import { cancellationPolicy as policy } from "@/content/policy";
import { Section, SectionHeading } from "@/components/ui/Section";

/**
 * The owner's cancellation policy, as written. The three rules that matter
 * most are set out as a short list; the rest is quiet text beneath.
 */
export function CancellationPolicy() {
  return (
    <Section tone="white" id="cancellation" labelledBy="cancellation-heading">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-5">
          <SectionHeading id="cancellation-heading" eyebrow="Class policy" title="Class cancellation policy" intro={policy.intro} />
        </div>
        <div className="lg:col-span-7">
          <h3 className="eyebrow">Cancellations</h3>
          <dl className="mt-4 border-t border-ink">
            {policy.cancellations.map((c) => (
              <div key={c.when} className="grid grid-cols-1 gap-1 border-b border-grey py-4 sm:grid-cols-[14rem_1fr] sm:gap-6">
                <dt className="font-semibold">{c.when}</dt>
                <dd>{c.outcome}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-8 space-y-6 text-sm">
            <div>
              <h3 className="font-semibold">Membership credits</h3>
              <p className="mt-1">{policy.credits}</p>
            </div>
            <div>
              <h3 className="font-semibold">Class cancellations by the coach</h3>
              <p className="mt-1">{policy.coachCancellations}</p>
            </div>
            <p>
              {policy.agreement} {policy.thanks}
            </p>
          </div>
        </div>
      </div>
    </Section>
  );
}
