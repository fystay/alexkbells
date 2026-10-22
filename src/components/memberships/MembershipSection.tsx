import { getService } from "@/content/services";
import { Section, SectionHeading } from "@/components/ui/Section";
import { MembershipCards } from "./MembershipCards";
import { MembershipFacts } from "./MembershipFacts";

const payg = getService("group-classes").prices[0];

/** Heading, the cards and the conditions. Used on the homepage and /memberships. */
export function MembershipSection({ headingId = "memberships-heading" }: { headingId?: string }) {
  return (
    <Section id="memberships" labelledBy={headingId}>
      <SectionHeading
        id={headingId}
        eyebrow="Kettlebell memberships"
        title="Train more, pay less per class"
        intro={`Pay as you go is £${payg.amountGbp} a class. Every membership brings the cost of each class down.`}
      />
      <div className="mt-10 lg:mt-14">
        <MembershipCards labelledBy={headingId} />
      </div>
      <MembershipFacts />
    </Section>
  );
}
