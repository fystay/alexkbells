import { Suspense } from "react";
import type { Metadata } from "next";
import { portalContext } from "@/lib/coach/context";
import { loadDashboard, type AttentionItem } from "@/lib/coach/dashboard";
import { loadMessage } from "@/lib/coach/errors";
import { formatPence } from "@/lib/coach/money";
import { formatLongDate } from "@/lib/coach/time";
import { ActionLink, Badge, EmptyState, LoadError, Metric, Panel, TextLink } from "@/components/coach/ui";
import { RevenueChart } from "@/components/coach/RevenueChart";
import { signOutCoach } from "../actions";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <>
      <div className="flex flex-col gap-4 border-b border-ink pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow text-muted">Coach portal</p>
          <h1 id="coach-heading" className="mt-2 font-display text-h2">
            Welcome back
          </h1>
        </div>
      </div>
      {/* Reads the session cookie, so it renders per request behind the boundary. */}
      <Suspense fallback={<p className="mt-8 text-muted">Checking your sign-in…</p>}>
        <Dashboard />
      </Suspense>
    </>
  );
}

const ATTENTION_LABEL: Record<AttentionItem["kind"], string> = {
  request: "Request",
  "payment-due": "Payment",
  "payment-failed": "Failed payment",
  upcoming: "Coming up",
  "check-in": "Check-in",
  renewal: "Renewal",
  package: "Package",
  "follow-up": "Follow-up",
};

async function Dashboard() {
  const { coach, db, today } = await portalContext();
  const account = (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
      <p>
        Signed in as <strong className="break-all">{coach.email}</strong>. {formatLongDate(today)}.
      </p>
      <form action={signOutCoach}>
        <button type="submit" className="inline-flex min-h-11 items-center border border-ink px-4 text-sm font-semibold uppercase tracking-[0.1em] hover:bg-ink hover:text-paper">
          Sign out
        </button>
      </form>
    </div>
  );
  if (!db) return <>{account}<LoadError message="The database isn't configured for this deployment (SUPABASE_URL and SUPABASE_SECRET_KEY)." /></>;

  const result = await loadDashboard(db, today);
  if (!result.ok) {
    return (
      <>
        {account}
        <LoadError message={loadMessage(result.error)} />
        <p className="mt-4">
          <TextLink href="/coach/requests">Open booking requests</TextLink>
        </p>
      </>
    );
  }
  const d = result.data;
  return (
    <>
      {account}

      <div className="mt-6 flex flex-wrap gap-2">
        <ActionLink href="/coach/finances/payments/new" variant="primary">
          Record a payment
        </ActionLink>
        <ActionLink href="/coach/clients/new">Add a client</ActionLink>
        <ActionLink href="/coach/sessions/new">Book a one-to-one</ActionLink>
      </div>

      <section aria-labelledby="summary-heading" className="mt-8">
        <h2 id="summary-heading" className="sr-only">
          Summary
        </h2>
        <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <li>
            <Metric emphasis label="Received this month" value={formatPence(d.receivedMonth.net)} note={d.receivedMonth.refunds ? `After ${formatPence(d.receivedMonth.refunds)} refunds` : "After refunds"} href="/coach/finances?period=month" />
          </li>
          <li>
            <Metric label="Received this week" value={formatPence(d.receivedWeek.net)} note="Monday to Sunday" href="/coach/finances?period=week" />
          </li>
          <li>
            <Metric label="Outstanding" value={formatPence(d.outstanding.due)} note={d.outstanding.later ? `${formatPence(d.outstanding.later)} more due later` : "Owed now"} href="/coach/finances#outstanding" />
          </li>
          <li>
            <Metric label="Active clients" value={d.activeClients} href="/coach/clients?status=active" />
          </li>
          <li>
            <Metric label="Sessions delivered" value={d.delivered.classes + d.delivered.pt} note={`This month: ${d.delivered.classes} classes, ${d.delivered.pt} one-to-one`} />
          </li>
          <li>
            <Metric label="Upcoming confirmed" value={d.upcoming.classPlaces + d.upcoming.pt} note={`Next 7 days: ${d.upcoming.classPlaces} class places, ${d.upcoming.pt} one-to-one`} href="/coach/classes" />
          </li>
          <li>
            <Metric label="Requests awaiting you" value={d.requests.new + d.requests.awaiting} note={`${d.requests.new} new, ${d.requests.awaiting} awaiting response`} href="/coach/requests" />
          </li>
          <li>
            <Metric label="Active online clients" value={d.online.active} note={`Expected ${formatPence(d.online.expectedMonthly)}/month (not yet received)`} href="/coach/online" />
          </li>
        </ul>
      </section>

      <div className="grid grid-cols-1 gap-x-12 lg:grid-cols-5">
        <Panel title="Needs attention" id="attention-heading" className="lg:col-span-3">
          {d.attention.length === 0 ? (
            <EmptyState title="Nothing needs you right now.">New requests, payments due, check-ins and follow-ups appear here.</EmptyState>
          ) : (
            <ul className="divide-y divide-line border-y border-line">
              {d.attention.slice(0, 25).map((item, i) => (
                <li key={`${item.href}-${i}`}>
                  <a href={item.href} className="flex min-h-11 flex-col gap-1 py-3 hover:bg-white sm:flex-row sm:items-center sm:gap-4">
                    <span className="shrink-0 sm:w-32">
                      <Badge tone={item.urgent ? "strong" : "plain"}>{ATTENTION_LABEL[item.kind]}</Badge>
                    </span>
                    <span className="min-w-0">
                      <span className="block font-semibold underline-offset-4 hover:underline">{item.title}</span>
                      <span className="block text-sm text-muted">{item.detail}</span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          )}
          {d.attention.length > 25 ? <p className="mt-3 text-sm text-muted">Showing 25 of {d.attention.length}.</p> : null}
        </Panel>

        <Panel title="Revenue" id="revenue-heading" className="lg:col-span-2" actions={<TextLink href="/coach/finances">Finances</TextLink>}>
          <RevenueChart id="dashboard-revenue" months={d.months} />
          <p className="mt-3 text-sm text-muted">Money actually received, after refunds. Unpaid charges and expected subscription income are not included.</p>
        </Panel>
      </div>
    </>
  );
}
