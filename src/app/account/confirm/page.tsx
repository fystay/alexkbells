import type { Metadata } from "next";
import Link from "next/link";
import { confirmSignIn } from "@/app/account/actions";
import { pageMetadata } from "@/lib/metadata";
import { isToken, SIGN_IN_PATH } from "@/lib/member-auth";
import { buttonClasses } from "@/components/ui/ButtonLink";
import { Section } from "@/components/ui/Section";
import { TitleBar } from "@/components/ui/TitleBar";

export const metadata: Metadata = pageMetadata({
  title: "Sign in",
  description: "Finish signing in to your RAENG membership.",
  path: "/account/confirm",
  noindex: true,
});

/**
 * Where the emailed link lands. Signing in takes a press of the button (a
 * POST), not just opening the link: some email services open links to scan
 * them, which would otherwise use up the one-time link.
 */
export default async function ConfirmSignInPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const token = (await searchParams).token;
  const valid = typeof token === "string" && isToken(token);
  return (
    <Section labelledBy="confirm-heading">
      <div className="max-w-lg">
        <p className="eyebrow">Members</p>
        <h1 id="confirm-heading" className="mt-3 font-display text-h1 text-balance">
          {valid ? "Sign in." : "Link not valid."}
        </h1>
        <TitleBar />
        {valid ? (
          <form action={confirmSignIn} className="mt-8">
            <input type="hidden" name="token" value={token} />
            <p className="text-lede">Press Sign in to open your account on this device.</p>
            <button type="submit" className={buttonClasses("action", "mt-6 w-full px-6 sm:w-auto")}>
              Sign in
            </button>
          </form>
        ) : (
          <p className="mt-5 text-lede">
            This sign-in link isn&apos;t complete. Try copying the whole link from the email, or{" "}
            <Link href={SIGN_IN_PATH} className="font-semibold underline underline-offset-4 hover:no-underline">
              ask for a new one
            </Link>
            .
          </p>
        )}
      </div>
    </Section>
  );
}
