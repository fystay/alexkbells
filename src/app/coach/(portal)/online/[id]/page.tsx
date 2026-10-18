import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { defaultPrices } from "@/lib/coach/classes";
import { getClient } from "@/lib/coach/clients";
import { portalContext } from "@/lib/coach/context";
import { collect } from "@/lib/coach/db";
import { loadMessage } from "@/lib/coach/errors";
import { SUBSCRIPTION_STATUS } from "@/lib/coach/labels";
import { listCharges } from "@/lib/coach/ledger";
import { formatPence } from "@/lib/coach/money";
import { getSubscription, listCheckIns } from "@/lib/coach/online";
import { PAYMENT_STATE_LABEL, paymentState } from "@/lib/coach/revenue";
import { formatDate } from "@/lib/coach/time";
import { SubscriptionFields } from "@/components/coach/SubscriptionFields";
import { ActionForm, Field, SubmitButton, TextArea } from "@/components/coach/form";
import { Badge, LoadError, Panel, TextLink } from "@/components/coach/ui";
import { chargePeriodAction, checkInAction, updateSubscriptionAction } from "../actions";

export const metadata: Metadata = { title: "Online coaching plan" };

export default function SubscriptionPage({ params }: PageProps<"/coach/online/[id]">) {
  return (
    <>
      <p className="text-sm">
        <TextLink href="/coach/online">← Online coaching</TextLink>
      </p>
      <Suspense fallback={<p className="mt-8 text-muted">Loading the plan…</p>}>
        <SubscriptionView params={params} />
      </Suspense>
    </>
  );
}

async function SubscriptionView({ params }: { params: PageProps<"/coach/online/[id]">["params"] }) {
  const { db, today } = await portalContext();
  const { id } = await params;
  if (!db) return <LoadError message="The database isn't configured for this deployment." />;
  const found = await getSubscription(db, id);
  if (!found.ok) return <LoadError message={loadMessage(found.error)} />;
  if (!found.data) notFound();
  const s = found.data;
  const loaded = collect(await Promise.all([getClient(db, s.client_id), listCheckIns(db, { subscriptionIds: [s.id] }), listCharges(db, { subscriptionId: s.id })] as const));
  if (!loaded.ok) return <LoadError message={loadMessage(loaded.error)} />;
  const [client, checkIns, charges] = loaded.data;
  const due = s.next_check_in_on && s.next_check_in_on <= today;
  const period = s.renews_on ?? s.start_on;

  return (
    <>
      <div className="mt-4 border-b border-ink pb-6">
        <p className="eyebrow text-muted">Online coaching</p>
        <h1 className="mt-2 font-display text-h2 break-words">{client ? client.full_name : "Deleted client"}</h1>
        <p className="mt-2 flex flex-wrap items-center gap-2">
          <span>
            {s.plan} · {formatPence(s.price_pence)}/month
          </span>
          <Badge tone={s.status === "active" ? "strong" : "muted"}>{SUBSCRIPTION_STATUS[s.status]}</Badge>
          {due ? <Badge>Check-in due</Badge> : null}
          {client ? <TextLink href={`/coach/clients/${client.id}?tab=online`}>Client record</TextLink> : null}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-x-12 lg:grid-cols-2">
        <div>
          <Panel title="Log a check-in" id="checkin-heading">
            <ActionForm action={checkInAction} resetOnSuccess label="Log a check-in">
              <input type="hidden" name="subscription" value={s.id} />
              <Field name="checked_in_on" label="Date" type="date" defaultValue={today} max={today} required />
              <TextArea name="summary" label="How it went" rows={3} maxLength={2000} required hint="Training and progress only: no health details." />
              <TextArea name="actions" label="Agreed actions" rows={2} maxLength={2000} />
              <div>
                <SubmitButton>Log check-in</SubmitButton>
              </div>
            </ActionForm>
          </Panel>
          <Panel title="Check-ins" id="history-heading">
            {checkIns.length ? (
              <ul className="divide-y divide-line border-y border-line">
                {checkIns.map((c) => (
                  <li key={c.id} className="py-3">
                    <p className="text-sm font-semibold">{formatDate(c.checked_in_on)}</p>
                    <p className="mt-1 whitespace-pre-line">{c.summary}</p>
                    {c.actions ? <p className="mt-1 text-sm whitespace-pre-line text-muted">Agreed: {c.actions}</p> : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">No check-ins yet.</p>
            )}
          </Panel>
        </div>
        <div>
          <Panel title="Payments" id="charges-heading">
            <p className="text-sm text-muted">Each month is charged once you raise it. It counts as received only when you record the payment.</p>
            {s.status === "active" && s.price_pence > 0 ? (
              <div className="mt-3">
                <ActionForm action={chargePeriodAction} confirm={`Add a ${formatPence(s.price_pence)} charge for the period from ${formatDate(period)}?`} label="Raise this period's charge">
                  <input type="hidden" name="subscription" value={s.id} />
                  <div>
                    <SubmitButton variant="secondary">Charge period from {formatDate(period)}</SubmitButton>
                  </div>
                </ActionForm>
              </div>
            ) : null}
            {charges.length ? (
              <ul className="mt-4 divide-y divide-line border-y border-line text-sm">
                {[...charges].reverse().map((c) => (
                  <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <span>
                      {c.period_start ? `From ${formatDate(c.period_start)}` : c.description} · {formatPence(c.amount_pence)}
                    </span>
                    <span className="flex items-center gap-2">
                      <Badge tone={paymentState(c) === "unpaid" ? "strong" : "muted"}>{c.voided_at ? "Cancelled" : PAYMENT_STATE_LABEL[paymentState(c)]}</Badge>
                      {!c.voided_at && c.outstanding_pence > 0 ? <TextLink href={`/coach/finances/payments/new?client=${s.client_id}&charge=${c.id}`}>Pay</TextLink> : null}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </Panel>
          <Panel title="Plan" id="plan-heading">
            <ActionForm action={updateSubscriptionAction} label="Plan details">
              <input type="hidden" name="subscription" value={s.id} />
              <SubscriptionFields subscription={s} defaults={{ pricePence: defaultPrices().onlinePence, today }} />
              <div>
                <SubmitButton variant="secondary">Save plan</SubmitButton>
              </div>
            </ActionForm>
          </Panel>
        </div>
      </div>
    </>
  );
}
