import Link from "next/link";
import { getService } from "@/content/services";
import { Section, SectionHeading } from "@/components/ui/Section";
import { MembershipCards } from "./MembershipCards";

const payg = getService("group-classes").prices[0];

/** Heading, cards and the footnote that makes the savings honest. Used on the homepage and /memberships. */
export function MembershipSection({ headingId = "memberships-heading", showTermsLink = true }: { headingId?: string; showTermsLink?: boolean }) {
  return (
    <Section tone="raised" id="memberships" labelledBy={headingId}>
      <SectionHeading
        id={headingId}
        eyebrow="Kettlebell memberships"
        title="Train more, pay less per class"
        intro={`Pay as you go is £${payg.amountGbp} a class. Every membership brings the cost of each class down.`}
      />
      <div className="mt-12">
        <MembershipCards labelledBy={headingId} />
      </div>
      <p className="mt-8 max-w-3xl text-sm text-muted-inverse">
        Savings are measured against £{payg.amountGbp} per class and assume you use every credit in the four-week membership period.
        {showTermsLink ? (
          <>
            {" "}
            <Link href="/memberships#how-it-works" className="font-semibold text-paper underline underline-offset-4 hover:no-underline">
              How memberships work
            </Link>{" "}
            and the{" "}
            <Link href="/memberships#cancellation" className="font-semibold text-paper underline underline-offset-4 hover:no-underline">
              cancellation policy
            </Link>
            .
          </>
        ) : null}
      </p>
    </Section>
  );
}
