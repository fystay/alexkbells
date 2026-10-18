import { Suspense } from "react";
import type { Metadata } from "next";
import { pageMetadata } from "@/lib/metadata";
import { requireCoach } from "@/lib/coach-session";
import { listRequests, requestStoreConfig, type RequestRow } from "@/lib/request-store";
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
      <form action={signOutCoach} className="mt-6">
        <button
          type="submit"
          className="inline-flex min-h-12 items-center justify-center border border-ink px-6 text-sm font-semibold uppercase tracking-[0.16em] transition-colors duration-150 hover:bg-ink hover:text-paper"
        >
          Sign out
        </button>
      </form>
      <Requests />
    </div>
  );
}

const when = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
  timeZone: "Europe/London",
});

/** Booking requests and online enquiries from the site, newest first. Only rendered after requireCoach(). */
async function Requests() {
  const config = requestStoreConfig();
  const rows = config ? await listRequests(config) : null;
  return (
    <section aria-labelledby="requests-heading" className="mt-14 max-w-3xl">
      <h2 id="requests-heading" className="font-display text-h3">
        Requests
      </h2>
      {rows === null ? (
        <p className="mt-4 text-muted">Requests couldn&apos;t be loaded. Try again shortly.</p>
      ) : rows.length === 0 ? (
        <p className="mt-4 text-muted">No requests yet. They appear here as soon as someone books or enquires.</p>
      ) : (
        <ul className="mt-6 divide-y divide-line border-y border-line">
          {rows.map((row) => (
            <RequestItem key={row.id} row={row} />
          ))}
        </ul>
      )}
    </section>
  );
}

function RequestItem({ row }: { row: RequestRow }) {
  return (
    <li className="py-5">
      <p className="eyebrow text-muted">
        {row.service} · received <time dateTime={row.createdAt}>{when.format(new Date(row.createdAt))}</time>
      </p>
      <p className="mt-2 font-semibold">{row.summary}</p>
      <p className="mt-1">
        {row.name} ·{" "}
        <a href={`mailto:${row.email}`} className="break-all underline underline-offset-4">
          {row.email}
        </a>
        {row.phone ? (
          <>
            {" · "}
            <a href={`tel:${row.phone.replace(/\s+/g, "")}`} className="underline underline-offset-4">
              {row.phone}
            </a>
          </>
        ) : null}
      </p>
      {Object.keys(row.details).length > 0 ? (
        <p className="mt-1 text-sm text-muted">
          {Object.entries(row.details)
            .map(([key, value]) => `${key[0].toUpperCase()}${key.slice(1)}: ${value}`)
            .join(" · ")}
        </p>
      ) : null}
      {row.message ? <p className="mt-2 whitespace-pre-line text-sm">{row.message}</p> : null}
    </li>
  );
}
