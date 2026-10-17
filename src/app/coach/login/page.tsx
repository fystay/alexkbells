import type { Metadata } from "next";
import { pageMetadata } from "@/lib/metadata";
import { coachLoginConfig } from "@/lib/coach-auth";
import { Section } from "@/components/ui/Section";
import { LoginForm } from "@/components/coach/LoginForm";

export const metadata: Metadata = pageMetadata({
  title: "Coach login",
  description: "Sign in to the coach area.",
  path: "/coach/login",
  noindex: true,
});

export default function CoachLoginPage() {
  // Read at build time, like the /book settings: redeploy after changing them.
  const enabled = coachLoginConfig() !== null;

  return (
    <Section labelledBy="coach-login-heading">
      <div className="max-w-md">
        <p className="eyebrow text-muted">Coach login</p>
        <h1 id="coach-login-heading" className="mt-4 font-display text-h1">
          Welcome back
        </h1>
        <div className="mt-10">
          {enabled ? <LoginForm /> : <p className="font-semibold">Coach login isn&apos;t set up yet.</p>}
        </div>
        <p className="mt-10 text-muted">This login is for the coach only.</p>
      </div>
    </Section>
  );
}
