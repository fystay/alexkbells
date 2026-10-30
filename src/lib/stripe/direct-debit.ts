import { randomUUID } from "node:crypto";
import { bookingDeliveryConfig } from "../booking-request";
import { rpc, select, update, type Db } from "../coach/db";
import { formatDate, type DateKey } from "../coach/time";
import type { Env } from "../env";
import { ACCOUNT_PATH, memberLinkOrigin } from "../member-auth";
import { formatPenceShort } from "../membership";
import { sendEmail } from "../send-email";
import { createCustomer, createDirectDebitPayment, createDirectDebitSetupSession } from "./api";
import type { StripeConfig } from "./config";

/**
 * Memberships by Direct Debit (owner, 2026-10-30). The first 4 weeks are paid
 * by card on Stripe's page; the member then sets up a Bacs Direct Debit on
 * Stripe's page (their bank details never touch this site), and each later
 * 4 weeks is collected from it. Collections are submitted a few days before
 * the period starts because Bacs takes about three working days. Cancelling
 * stops all of it; credits already given stay usable until their period ends.
 * The database decides what is owed and when (20261105000000_akb_direct_debit.sql);
 * Stripe's signed webhook decides what was paid (sync.ts).
 */

/** Days ahead of a period's start that its collection is submitted. */
export const COLLECTION_LEAD_DAYS = 6;

export type SetupResult = { ok: true; url: string } | { ok: false; reason: "already_set_up" | "unavailable" };

interface CustomerRow {
  customer_id: string;
  dd_status: "pending" | "active" | "ended";
}

/** Opens Stripe's Direct Debit set-up page for a member who has paid their first period. */
export async function startDirectDebitSetup(
  db: Db,
  stripe: StripeConfig,
  member: { clientId: string; email: string; name: string },
  returnUrl: string,
  fetchImpl: typeof fetch = fetch,
): Promise<SetupResult> {
  const existing = await select<CustomerRow>(db, "akb_stripe_customers", [["select", "customer_id,dd_status"], ["client_id", `eq.${member.clientId}`]]);
  if (!existing.ok) return { ok: false, reason: "unavailable" };
  let customerId = existing.data[0]?.customer_id;
  if (existing.data[0]?.dd_status === "active") return { ok: false, reason: "already_set_up" };
  if (!customerId) {
    const made = await createCustomer(stripe, { idempotencyKey: `dd-customer-${member.clientId}`, email: member.email, name: member.name, clientId: member.clientId }, fetchImpl);
    if (!made.ok) {
      console.error(`Stripe: creating a customer failed (${made.status ?? "network"})`);
      return { ok: false, reason: "unavailable" };
    }
    customerId = made.data.id;
    const saved = await rpc<null>(db, "akb_dd_begin", { p_client: member.clientId, p_environment: stripe.environment, p_customer: customerId });
    if (!saved.ok) return { ok: false, reason: "unavailable" };
  }
  const session = await createDirectDebitSetupSession(
    stripe,
    { idempotencyKey: `dd-setup-${randomUUID()}`, customerId, clientReference: member.clientId, successUrl: returnUrl, cancelUrl: returnUrl },
    fetchImpl,
  );
  if (!session.ok) {
    console.error(`Stripe: opening Direct Debit set-up failed (${session.status ?? "network"})`);
    return { ok: false, reason: "unavailable" };
  }
  return { ok: true, url: session.data.url };
}

interface DueRow {
  period_id: string;
  client_id: string;
  email: string;
  plan_name: string;
  outstanding_pence: number;
  customer_id: string;
  payment_method_id: string;
  environment: string;
  attempts: number;
}

export interface CollectionSummary {
  ok: boolean;
  periodsCreated: number;
  submitted: number;
  failed: number;
}

/**
 * Daily: creates the next period early for members with a Direct Debit, then
 * submits each unpaid period's collection to Stripe (once per try: the
 * idempotency key names the period and try). Stripe's answer comes by webhook
 * days later. Stripe refusing outright (a cancelled mandate, say) counts as a
 * failed try, so the member is told and the membership pauses after three.
 */
export async function collectDirectDebits(db: Db, stripe: StripeConfig, today: DateKey, fetchImpl: typeof fetch = fetch): Promise<CollectionSummary> {
  const created = await rpc<number>(db, "akb_renew_dd_memberships", { p_today: today, p_lead_days: COLLECTION_LEAD_DAYS });
  if (!created.ok) return { ok: false, periodsCreated: 0, submitted: 0, failed: 0 };
  const due = await rpc<DueRow[]>(db, "akb_dd_due", { p_today: today, p_lead_days: COLLECTION_LEAD_DAYS, p_max: 3 });
  if (!due.ok) return { ok: false, periodsCreated: created.data, submitted: 0, failed: 0 };
  const summary: CollectionSummary = { ok: true, periodsCreated: created.data, submitted: 0, failed: 0 };
  for (const row of due.data) {
    if (row.environment !== stripe.environment) continue;
    const attempt = row.attempts + 1;
    const intent = await createDirectDebitPayment(
      stripe,
      {
        idempotencyKey: `dd-${row.period_id}-${attempt}`,
        customerId: row.customer_id,
        paymentMethodId: row.payment_method_id,
        amountPence: row.outstanding_pence,
        description: `RAENG ${row.plan_name} membership`,
        metadata: { period: row.period_id },
      },
      fetchImpl,
    );
    if (intent.ok) {
      const noted = await rpc<null>(db, "akb_dd_record_attempt", { p_period: row.period_id, p_environment: stripe.environment, p_payment_intent: intent.data.id, p_today: today });
      if (noted.ok) summary.submitted += 1;
      else summary.failed += 1;
      continue;
    }
    // A server or network error: nothing was submitted, so try again tomorrow. A refusal (4xx) is a failed try.
    if (intent.status === null || intent.status >= 500) {
      summary.failed += 1;
      continue;
    }
    const refused = `refused-${row.period_id}-${attempt}`;
    await rpc<null>(db, "akb_dd_record_attempt", { p_period: row.period_id, p_environment: stripe.environment, p_payment_intent: refused, p_today: today });
    await rpc<string>(db, "akb_dd_mark", { p_payment_intent: refused, p_status: "failed" });
    console.error(`Stripe: a Direct Debit collection was refused (${intent.status})`);
    summary.failed += 1;
  }
  if (summary.failed) console.error(`Direct Debit collections: ${summary.failed} of ${due.data.length} couldn't be submitted`);
  return summary;
}

interface FailedRow {
  period_id: string;
  client_id: string;
  paused: boolean;
  attempts: number;
}

/**
 * Tells a member (and Alex, once the membership is paused) when a Direct Debit
 * collection failed. Once per failure; without email settings nothing is
 * marked, so it is tried again.
 */
export async function notifyDirectDebitFailures(db: Db, env: Env = process.env, fetchImpl: typeof fetch = fetch): Promise<number> {
  const email = bookingDeliveryConfig(env);
  if (!email) return 0;
  const rows = await select<FailedRow>(db, "akb_dd_collections", [["select", "period_id,client_id,paused,attempts"], ["status", "eq.failed"], ["notified_at", "is.null"], ["limit", "50"]]);
  if (!rows.ok) return 0;
  let sent = 0;
  for (const r of rows.data) {
    const info = await select<{ email: string; full_name: string }>(db, "akb_clients", [["select", "email,full_name"], ["id", `eq.${r.client_id}`]]);
    const person = info.ok ? info.data[0] : undefined;
    const period = await select<{ period_start: string; period_end: string; charge_id: string }>(db, "akb_membership_periods", [["select", "period_start,period_end,charge_id"], ["id", `eq.${r.period_id}`]]);
    const p = period.ok ? period.data[0] : undefined;
    if (!person || !p) continue;
    const balance = await select<{ outstanding_pence: number }>(db, "akb_charge_balances", [["select", "outstanding_pence"], ["id", `eq.${p.charge_id}`]]);
    const owed = balance.ok && balance.data[0] ? formatPenceShort(balance.data[0].outstanding_pence) : "your membership payment";
    const account = `${memberLinkOrigin(env)}${ACCOUNT_PATH}`;
    const mailed = await sendEmail(
      email,
      {
        idempotencyKey: `dd-failed/${r.period_id}/${r.attempts}`,
        to: person.email,
        replyTo: email.to,
        subject: r.paused ? "Your RAENG membership is paused" : "Your RAENG Direct Debit payment didn't go through",
        text: [
          `We couldn't collect ${owed} by Direct Debit for your membership period ${formatDate(p.period_start as DateKey)} to ${formatDate(p.period_end as DateKey)}.`,
          "",
          r.paused
            ? "We've tried three times, so your membership is paused and no more payments will be taken. Reply to this email and we'll sort it out together."
            : "We'll try again in a few days. Please make sure the money is in your account. If it keeps failing, your membership will be paused.",
          "",
          `Your account: ${account}`,
        ].join("\n"),
      },
      fetchImpl,
    );
    if (!mailed.ok) continue;
    if (r.paused) {
      await sendEmail(
        email,
        { idempotencyKey: `dd-paused-alex/${r.period_id}`, replyTo: person.email, subject: `Membership paused: ${person.full_name}`, text: `${person.full_name} (${person.email}) has had three failed Direct Debit collections, so their membership is paused.` },
        fetchImpl,
      );
    }
    const marked = await update(db, "akb_dd_collections", [["period_id", `eq.${r.period_id}`]], { notified_at: new Date().toISOString() });
    if (marked.ok) sent += 1;
  }
  return sent;
}
