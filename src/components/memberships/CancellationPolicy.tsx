import { cancellationPolicy as policy } from "@/content/policy";
import { Section, SectionHeading } from "@/components/ui/Section";

/**
 * The owner's cancellation policy, as written. The three rules that matter
 * most are set out as a short list; the rest is quiet text beneath.
 */
export function CancellationPolicy({ title = "Class cancellation policy" }: { title?: string }) {
  return (
    <Section tone="white" id="cancellation" labelledBy="cancellation-heading">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-5">
          <SectionHeading id="cancellation-heading" eyebrow="Class policy" title={title} intro={policy.intro} />
        </div>
        <div className="lg:col-span-7">
          <h3 className="card-title">Cancellations</h3>
          <ul data-reveal className="lined mt-4">
            {policy.cancellations.map((c) => (
              <li key={c.when}>
                <p className="font-semibold">{c.when}</p>
                <p className="mt-0.5">{c.outcome}</p>
              </li>
            ))}
          </ul>
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
