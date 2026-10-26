import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { site } from "@/content/site";
import { pageMetadata } from "@/lib/metadata";
import { ACCOUNT_PATH } from "@/lib/member-auth";
import { currentMember } from "@/lib/member-session";
import { SignInForm } from "@/components/account/SignInForm";
import { Section } from "@/components/ui/Section";

export const metadata: Metadata = pageMetadata({
  title: "Member sign-in",
  description: "Sign in to see your RAENG membership, credits and classes.",
  path: "/account/sign-in",
  noindex: true,
});

const NOTES: Record<string, string> = {
  invalid: "That sign-in link has expired or has already been used. Ask for a new one below.",
  out: "You're signed out.",
};

/** Members sign in with a one-time link emailed to them: no password. */
export default async function MemberSignInPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  if (await currentMember()) redirect(ACCOUNT_PATH);
  const params = await searchParams;
  const note = params.link === "invalid" ? NOTES.invalid : params.signed === "out" ? NOTES.out : null;
  return (
    <Section labelledBy="sign-in-heading">
      <div className="max-w-lg">
        <p className="eyebrow">Members</p>
        <h1 id="sign-in-heading" className="mt-3 font-display text-h1 text-balance">
          Sign in.
        </h1>
        <p className="mt-5 text-lede">See your credits and renewal date, and book or cancel classes. We&apos;ll email you a link: no password needed.</p>
        {note ? (
          <p role="status" className="card mt-8 px-5 py-4 font-semibold">
            {note}
          </p>
        ) : null}
        <div className="mt-8">
          <SignInForm />
        </div>
        <p className="mt-10 text-sm">
          Not a member yet? See the{" "}
          <a href="/memberships" className="font-semibold underline underline-offset-4 hover:no-underline">
            memberships
          </a>
          . Questions? Message Alex on{" "}
          <a href={site.social.instagram.url} target="_blank" rel="noopener noreferrer" className="font-semibold underline underline-offset-4 hover:no-underline">
            Instagram<span className="sr-only"> (opens in a new tab)</span>
          </a>
          .
        </p>
      </div>
    </Section>
  );
}
