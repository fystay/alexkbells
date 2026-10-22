import Link from "next/link";
import { membershipKeyFacts } from "@/content/policy";

/**
 * The conditions people must see before committing, set out plainly under the
 * cards (not in small print), with a link to the full wording.
 */
export function MembershipFacts() {
  return (
    <div className="mt-10">
      <h3 className="eyebrow">Before you join</h3>
      <ul className="mt-4 grid grid-cols-1 gap-x-8 gap-y-5 border-t border-grey pt-5 sm:grid-cols-2 lg:grid-cols-4">
        {membershipKeyFacts.map((f) => (
          <li key={f.title}>
            <p className="font-semibold">{f.title}</p>
            <p className="mt-1 text-sm">{f.body}</p>
          </li>
        ))}
      </ul>
      <p className="mt-6 max-w-3xl text-sm">
        Savings are comparisons with the standard £12 pay-as-you-go price and assume every credit is used in the four-week period.{" "}
        <Link href="/memberships#how-it-works" className="font-semibold underline underline-offset-4 hover:no-underline">
          How memberships work
        </Link>{" "}
        and the{" "}
        <Link href="/memberships#cancellation" className="font-semibold underline underline-offset-4 hover:no-underline">
          full cancellation policy
        </Link>
        .
      </p>
    </div>
  );
}
