import { insert, rpc, select, update, type Db, type DbError } from "../coach/db";
import { toLondon } from "../coach/time";
import { createPaymentLink, getOrderPaymentIds, getPayment, getRefund, type SquareResult } from "./api";
import type { SquareConfig, SquareWebhookConfig } from "./config";
import { verifySquareSignature } from "./signature";

/**
 * Keeps Supabase in step with Square. Square is the source of truth for card
 * payments: a webhook only says "something changed"; the payment or refund is
 * then re-read from Square's API and applied by one idempotent database
 * function (supabase/migrations/20261021000000_akb_square.sql). Logs carry ids,
 * types, outcomes and status codes only.
 */

type Outcome = "recorded" | "duplicate" | "unknown_order" | "unknown_payment" | "pending" | "not_paid" | "not_refunded" | "ignored" | "other_location";
export type SyncResult = { ok: true; outcome: Outcome } | { ok: false; reason: string };

const squareFailure = (what: string, r: SquareResult<unknown>): SyncResult => ({ ok: false, reason: `square-${what}-${r.ok ? "ok" : (r.status ?? "network")}` });
const dbFailure = (e: DbError): SyncResult => ({ ok: false, reason: `db-${e.kind}${e.rule ? `-${e.rule}` : ""}` });

/** Re-reads one payment from Square and records it if it completed against one of our links. */
export async function syncPayment(db: Db, square: SquareConfig, paymentId: string, fetchImpl: typeof fetch = fetch): Promise<SyncResult> {
  const payment = await getPayment(square, paymentId, fetchImpl);
  if (!payment.ok) return squareFailure("payment", payment);
  const p = payment.data;
  if (p.locationId !== square.locationId) return { ok: true, outcome: "other_location" };
  if (!p.orderId) return { ok: true, outcome: "unknown_order" };
  const result = await rpc<Outcome>(db, "akb_apply_square_payment", {
    p_environment: square.environment,
    p_payment_id: p.id,
    p_order_id: p.orderId,
    p_status: p.status,
    p_amount_pence: p.total.amountPence,
    p_currency: p.total.currency,
    p_paid_on: toLondon(p.createdAt).date,
  });
  return result.ok ? { ok: true, outcome: result.data } : dbFailure(result.error);
}

/** Re-reads one refund from Square; its payment is synced first, so order of arrival doesn't matter. */
export async function syncRefund(db: Db, square: SquareConfig, refundId: string, fetchImpl: typeof fetch = fetch): Promise<SyncResult> {
  const refund = await getRefund(square, refundId, fetchImpl);
  if (!refund.ok) return squareFailure("refund", refund);
  const r = refund.data;
  if (r.locationId && r.locationId !== square.locationId) return { ok: true, outcome: "other_location" };
  const payment = await syncPayment(db, square, r.paymentId, fetchImpl);
  if (!payment.ok) return payment;
  const result = await rpc<Outcome>(db, "akb_apply_square_refund", {
    p_environment: square.environment,
    p_refund_id: r.id,
    p_payment_id: r.paymentId,
    p_status: r.status,
    p_amount_pence: r.amount.amountPence,
    p_currency: r.amount.currency,
    p_refunded_on: toLondon(r.createdAt).date,
  });
  return result.ok ? { ok: true, outcome: result.data } : dbFailure(result.error);
}

interface EventRow {
  event_id: string;
  attempts: number;
  processed_at: string | null;
}

export interface WebhookResponse {
  status: number;
  body: Record<string, string>;
}

/** Bodies bigger than this are refused before verification (Square events are a few KB). */
export const MAX_WEBHOOK_BYTES = 64 * 1024;

/**
 * Handles one webhook delivery. 403 for a bad signature; 200 once processed
 * (or already processed, or not ours); 500 when Square or the database
 * couldn't be reached, so Square delivers it again.
 */
export async function handleSquareWebhook(
  db: Db,
  square: SquareConfig,
  webhook: SquareWebhookConfig,
  rawBody: string,
  signature: string | null,
  fetchImpl: typeof fetch = fetch,
): Promise<WebhookResponse> {
  if (Buffer.byteLength(rawBody, "utf8") > MAX_WEBHOOK_BYTES) return { status: 413, body: { error: "too-large" } };
  if (!verifySquareSignature(rawBody, signature, webhook.signatureKey, webhook.notificationUrl)) {
    console.error("Square webhook: signature check failed");
    return { status: 403, body: { error: "signature" } };
  }
  let event: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(rawBody);
    if (typeof parsed !== "object" || parsed === null) throw new Error("not an object");
    event = parsed as Record<string, unknown>;
  } catch {
    return { status: 400, body: { error: "json" } };
  }
  const eventId = typeof event.event_id === "string" ? event.event_id.slice(0, 100) : "";
  const type = typeof event.type === "string" ? event.type.slice(0, 60) : "";
  const data = typeof event.data === "object" && event.data !== null ? (event.data as Record<string, unknown>) : {};
  const objectId = typeof data.id === "string" ? data.id.slice(0, 100) : "";
  if (!eventId || !type) return { status: 400, body: { error: "event" } };

  // Duplicate-delivery protection: one row per Square event id.
  const inserted = await insert<EventRow>(db, "akb_square_events", { event_id: eventId, environment: square.environment, type, object_id: objectId });
  if (!inserted.ok) {
    if (inserted.error.kind !== "conflict") return { status: 500, body: { error: "db" } };
    const existing = await select<EventRow>(db, "akb_square_events", [["event_id", `eq.${eventId}`]]);
    if (!existing.ok || !existing.data[0]) return { status: 500, body: { error: "db" } };
    if (existing.data[0].processed_at) return { status: 200, body: { outcome: "duplicate" } };
    await update(db, "akb_square_events", [["event_id", `eq.${eventId}`]], { attempts: Math.min(existing.data[0].attempts + 1, 1000) });
  }

  let result: SyncResult;
  if (!objectId) result = { ok: true, outcome: "ignored" };
  else if (type.startsWith("payment.")) result = await syncPayment(db, square, objectId, fetchImpl);
  else if (type.startsWith("refund.")) result = await syncRefund(db, square, objectId, fetchImpl);
  else result = { ok: true, outcome: "ignored" };

  const outcome = result.ok ? result.outcome : `error:${result.reason}`.slice(0, 60);
  await update(db, "akb_square_events", [["event_id", `eq.${eventId}`]], {
    outcome,
    ...(result.ok ? { processed_at: new Date().toISOString() } : {}),
  });
  console.log(`Square webhook: ${type} ${eventId} → ${outcome}`);
  return result.ok ? { status: 200, body: { outcome } } : { status: 500, body: { error: "retry" } };
}

interface LinkRow {
  id: string;
  environment: string;
  charge_id: string;
  client_id: string;
  amount_pence: number;
  idempotency_key: string;
  square_link_id: string | null;
  square_order_id: string | null;
  url: string;
  status: "creating" | "open" | "paid" | "cancelled";
}

interface ChargeBalance {
  id: string;
  client_id: string;
  description: string;
  voided_at: string | null;
  outstanding_pence: number;
}

export type LinkResult = { ok: true; url: string; amountPence: number } | { ok: false; reason: "not-found" | "nothing-owed" | "square" | "db" };

/**
 * A Square payment link for what's still owed on a charge. Retrying (double
 * click, timeout) reuses the same idempotency key, so Square returns the same
 * link instead of making another; a charge has at most one live link.
 */
export async function createChargeLink(db: Db, square: SquareConfig, chargeId: string, fetchImpl: typeof fetch = fetch): Promise<LinkResult> {
  const live = await select<LinkRow>(db, "akb_square_payment_links", [["charge_id", `eq.${chargeId}`], ["status", "in.(creating,open)"]]);
  if (!live.ok) return { ok: false, reason: "db" };
  let link = live.data[0];
  if (link?.status === "open") return { ok: true, url: link.url, amountPence: link.amount_pence };

  const charges = await select<ChargeBalance>(db, "akb_charge_balances", [["id", `eq.${chargeId}`]]);
  if (!charges.ok) return { ok: false, reason: "db" };
  const charge = charges.data[0];
  if (!charge) return { ok: false, reason: "not-found" };
  if (charge.voided_at || charge.outstanding_pence <= 0) return { ok: false, reason: "nothing-owed" };

  if (!link) {
    const created = await insert<LinkRow>(db, "akb_square_payment_links", {
      environment: square.environment,
      charge_id: charge.id,
      client_id: charge.client_id,
      amount_pence: charge.outstanding_pence,
    });
    if (!created.ok || !created.data[0]) return { ok: false, reason: "db" };
    link = created.data[0];
  }
  if (link.environment !== square.environment) return { ok: false, reason: "db" };

  const made = await createPaymentLink(
    square,
    { idempotencyKey: link.idempotency_key, name: charge.description, amountPence: link.amount_pence, note: `Alex K Bells ref ${link.id.slice(0, 8)}` },
    fetchImpl,
  );
  if (!made.ok) {
    console.error(`Square: creating a payment link failed (${made.status ?? "network"})`);
    return { ok: false, reason: "square" };
  }
  const opened = await update<LinkRow>(db, "akb_square_payment_links", [["id", `eq.${link.id}`], ["status", "eq.creating"]], {
    status: "open",
    square_link_id: made.data.id,
    square_order_id: made.data.orderId,
    url: made.data.url,
  });
  if (!opened.ok) return { ok: false, reason: "db" };
  return { ok: true, url: made.data.url, amountPence: link.amount_pence };
}

export interface ReconcileSummary {
  ok: boolean;
  checked: number;
  recorded: number;
  failed: number;
}

/**
 * Safety net for missed webhooks: asks Square which payments were made against
 * each open link and applies them (idempotently, so overlap with webhooks is harmless).
 */
export async function reconcileOpenLinks(db: Db, square: SquareConfig, fetchImpl: typeof fetch = fetch, limit = 50): Promise<ReconcileSummary> {
  const links = await select<LinkRow>(db, "akb_square_payment_links", [
    ["environment", `eq.${square.environment}`],
    ["status", "eq.open"],
    ["order", "created_at.asc"],
    ["limit", String(limit)],
  ]);
  if (!links.ok) return { ok: false, checked: 0, recorded: 0, failed: 0 };
  const summary: ReconcileSummary = { ok: true, checked: links.data.length, recorded: 0, failed: 0 };
  for (const link of links.data) {
    if (!link.square_order_id) continue;
    const ids = await getOrderPaymentIds(square, link.square_order_id, fetchImpl);
    if (!ids.ok) {
      summary.failed += 1;
      continue;
    }
    for (const id of ids.data) {
      const result = await syncPayment(db, square, id, fetchImpl);
      if (!result.ok) summary.failed += 1;
      else if (result.outcome === "recorded") summary.recorded += 1;
    }
  }
  if (summary.failed) console.error(`Square reconcile: ${summary.failed} of ${summary.checked} links couldn't be checked`);
  return summary;
}

export interface LiveLink {
  charge_id: string;
  url: string;
  amount_pence: number;
  environment: string;
}

/** A client's open Square links, for their charges list. */
export async function listOpenLinks(db: Db, clientId: string): Promise<LiveLink[]> {
  const result = await select<LiveLink>(db, "akb_square_payment_links", [
    ["select", "charge_id,url,amount_pence,environment"],
    ["client_id", `eq.${clientId}`],
    ["status", "eq.open"],
  ]);
  return result.ok ? result.data : [];
}
