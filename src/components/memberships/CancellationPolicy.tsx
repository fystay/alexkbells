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
          <div className="mt-3 flex flex-col gap-3">
            <div className="rounded-[1.25rem] bg-white px-5 py-[1.125rem]">
              <h3 className="font-semibold">Membership credits</h3>
              <p className="mt-0.5">{policy.credits}</p>
            </div>
            <div className="rounded-[1.25rem] bg-white px-5 py-[1.125rem]">
              <h3 className="font-semibold">Class cancellations by the coach</h3>
              <p className="mt-0.5">{policy.coachCancellations}</p>
            </div>
          </div>
          <p className="mt-6 text-sm">
            {policy.agreement} {policy.thanks}
          </p>
        </div>
      </div>
    </Section>
  );
}
