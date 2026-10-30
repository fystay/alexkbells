import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { BILLING_WEEKS } from "@/content/memberships";
import { coachDb, isUuid } from "@/lib/coach/db";
import { formatLongDate, type DateKey } from "@/lib/coach/time";
import { SIGN_IN_PATH } from "@/lib/member-auth";
import { signupStatus, type SignupStatus } from "@/lib/membership-checkout";
import { pageMetadata } from "@/lib/metadata";
import { buttonClasses } from "@/components/ui/ButtonLink";
import { Section } from "@/components/ui/Section";

export const metadata: Metadata = pageMetadata({
  title: "Your membership",
  description: "Your RAENG Fitness membership after paying.",
  path: "/memberships/join/done",
  noindex: true,
});

/**
 * Where Stripe's payment page sends people back to. It only reads the
 * sign-up's state from the database, which changes once Stripe's verified
 * webhook has recorded the payment: arriving here proves nothing, so the page
 * never says "paid" until the database does. While it waits, it refreshes
 * itself every few seconds. Shows the plan and the state only (the id in the
 * address is random; no personal details are shown).
 */
export default async function JoinDonePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await connection();
  const raw = (await searchParams).signup;
  const id = typeof raw === "string" && isUuid(raw) ? raw : null;
  const db = coachDb();
  const signup = id && db ? await signupStatus(db, id) : null;
  return (
    <Section labelledBy="done-heading">
      {signup?.status === "awaiting_payment" ? <meta httpEquiv="refresh" content="4" /> : null}
      <div className="max-w-xl" role="status">
        <Body signup={signup} />
      </div>
    </Section>
  );
}

function Body({ signup }: { signup: SignupStatus | null }) {
  const heading = "mt-3 font-display text-h1 text-balance";
  if (!signup || signup.status === "replaced") {
    return (
      <>
        <p className="eyebrow">Memberships</p>
        <h1 id="done-heading" className={heading}>
          We couldn&apos;t find that sign-up.
        </h1>
        <p className="mt-5 text-lede">If you&apos;ve paid, you&apos;ll get an email from us shortly. Otherwise you can join again from the memberships page.</p>
        <Link href="/memberships" className={buttonClasses("action", "mt-8 w-full px-6 sm:w-auto")}>
          See memberships
        </Link>
      </>
    );
  }
  if (signup.status === "awaiting_payment") {
    return (
      <>
        <p className="eyebrow">{signup.plan_name} membership</p>
        <h1 id="done-heading" className={heading}>
          Waiting for Stripe to confirm.
        </h1>
        <p className="mt-5 text-lede">This usually takes a few seconds. This page updates by itself.</p>
        {signup.payUrl ? (
          <p className="mt-6">
            Didn&apos;t finish paying?{" "}
            <a href={signup.payUrl} className="font-semibold underline underline-offset-4 hover:no-underline">
              Go back to Stripe to pay
            </a>
          </p>
        ) : null}
      </>
    );
  }
  if (signup.status === "needs_attention") {
    return (
      <>
        <p className="eyebrow">{signup.plan_name} membership</p>
        <h1 id="done-heading" className={heading}>
          Payment received.
        </h1>
        <p className="mt-5 text-lede">Thanks. Alex will finish setting up your membership and email you.</p>
      </>
    );
  }
  const classDate = signup.class_date ? formatLongDate(signup.class_date as DateKey) : null;
  return (
    <>
      <p className="eyebrow">{signup.plan_name} membership</p>
      <h1 id="done-heading" className={heading}>
        You&apos;re in.
      </h1>
      <p className="mt-5 text-lede">
        {signup.first_class === "booked" && classDate
          ? `Your payment went through and your membership has started. Your first class is booked for ${classDate}.`
          : signup.first_class === "unavailable"
            ? "Your payment went through and your membership has started. Your first class couldn't be booked (it may have filled up), so please book another from your account."
            : "Your payment went through and your membership has started. Book your classes from your account."}
      </p>
      <p className="mt-4">You&apos;ll get a payment link by email every {BILLING_WEEKS} weeks when it renews.</p>
      <Link href={SIGN_IN_PATH} className={buttonClasses("action", "mt-8 w-full px-6 sm:w-auto")}>
        Sign in to your account
      </Link>
    </>
  );
}
