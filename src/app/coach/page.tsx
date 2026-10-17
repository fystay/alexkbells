import { Suspense } from "react";
import type { Metadata } from "next";
import { pageMetadata } from "@/lib/metadata";
import { requireCoach } from "@/lib/coach-session";
import { Section } from "@/components/ui/Section";
import { signOutCoach } from "./actions";

export const metadata: Metadata = pageMetadata({
  title: "Coach area",
  description: "Coach area.",
  path: "/coach",
  noindex: true,
});

export default function CoachPage() {
  return (
    <Section labelledBy="coach-heading">
      <p className="eyebrow text-muted">Coach area</p>
      <h1 id="coach-heading" className="mt-4 font-display text-h1">
        Welcome back
      </h1>
      {/* Reads the session cookie, so it renders per request behind the boundary. */}
      <Suspense fallback={<p className="mt-8 text-muted">Checking your sign-in…</p>}>
        <CoachDetails />
      </Suspense>
    </Section>
  );
}

async function CoachDetails() {
  const coach = await requireCoach();
  return (
    <div className="mt-8 max-w-xl">
      <p>
        Signed in as <strong className="break-all">{coach.email}</strong>.
      </p>
      <p className="mt-4 text-muted">
        Bookings are still arranged by message, so there&apos;s nothing to manage here yet.
      </p>
      <form action={signOutCoach} className="mt-10">
        <button
          type="submit"
          className="inline-flex min-h-12 items-center justify-center border border-ink px-6 text-sm font-semibold uppercase tracking-[0.16em] transition-colors duration-150 hover:bg-ink hover:text-paper"
        >
          Sign out
        </button>
      </form>
    </div>
  );
}
