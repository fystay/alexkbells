import type { Db } from "../coach/db";
import type { StripeConfig, StripeWebhookConfig } from "./config";
import { stripeSignature } from "./signature";
import { handleStripeWebhook } from "./sync";

/**
 * A Stripe stand-in for tests: checkout sessions, payment intents and refunds
 * held in memory, answering the same REST calls as api.ts. Like Stripe, a
 * repeated Idempotency-Key returns the same session. Requests to anything
 * else go to `fallback` (the test database's fetch).
 */

export const testStripe: StripeConfig = { environment: "sandbox", baseUrl: "https://api.stripe.test", secretKey: "sk_test_not_real" };
export const testWebhook: StripeWebhookConfig = { environment: "sandbox", signingSecret: "whsec_test_not_real" };

export interface StripeCall {
  method: string;
  path: string;
  headers: Record<string, string>;
  form: URLSearchParams;
}

/** Stripe ids are unique across the whole run, as in Stripe (the database refuses a repeated session id). */
let ids = 0;

export function stripeStandIn(fallback: (url: string, init?: RequestInit) => Promise<Response>, config: StripeConfig = testStripe) {
  const sessions = new Map<string, Record<string, unknown>>();
  const byKey = new Map<string, string>();
  const refunds = new Map<string, Record<string, unknown>>();
  const calls: StripeCall[] = [];
  let down = false;
  const created = () => Math.floor(Date.parse("2026-10-20T10:00:00Z") / 1000);

  const fetchImpl = (async (url: string, init: RequestInit = {}) => {
    const u = String(url);
    if (!u.startsWith(config.baseUrl)) return fallback(url, init);
    const [path, query = ""] = u.slice(config.baseUrl.length).split("?");
    const form = new URLSearchParams(init.method === "POST" ? String(init.body ?? "") : query);
    const headers = (init.headers ?? {}) as Record<string, string>;
    calls.push({ method: init.method ?? "GET", path, headers, form });
    if (down) return Response.json({ error: { type: "api_error" } }, { status: 500 });

    if (init.method === "POST" && path === "/v1/checkout/sessions") {
      const key = headers["Idempotency-Key"];
      if (!key || !byKey.has(key)) {
        const id = `cs_test_${++ids}`;
        sessions.set(id, {
          id,
          object: "checkout.session",
          mode: form.get("mode") ?? "payment",
          status: "open",
          payment_status: "unpaid",
          payment_intent: null,
          amount_total: Number(form.get("line_items[0][price_data][unit_amount]") ?? 0),
          currency: "gbp",
          created: created(),
          url: `https://checkout.stripe.test/c/pay/${id}`,
        });
        if (key) byKey.set(key, id);
      }
      return Response.json(sessions.get(key ? byKey.get(key)! : `cs_test_${ids}`));
    }
    const one = path.match(/^\/v1\/checkout\/sessions\/([\w-]+)$/);
    if (init.method !== "POST" && one) return sessions.has(one[1]) ? Response.json(sessions.get(one[1])) : Response.json({ error: {} }, { status: 404 });
    if (path === "/v1/checkout/sessions") {
      const pi = form.get("payment_intent");
      return Response.json({ data: [...sessions.values()].filter((s) => s.payment_intent === pi) });
    }
    const oneRefund = path.match(/^\/v1\/refunds\/([\w-]+)$/);
    if (oneRefund) return refunds.has(oneRefund[1]) ? Response.json(refunds.get(oneRefund[1])) : Response.json({ error: {} }, { status: 404 });
    if (path === "/v1/refunds") {
      const pi = form.get("payment_intent");
      return Response.json({ data: [...refunds.values()].filter((r) => r.payment_intent === pi) });
    }
    return Response.json({}, { status: 404 });
  }) as typeof fetch;

  return {
    fetchImpl,
    calls,
    sessions,
    setDown: (value: boolean) => (down = value),
    /** The customer paid this session: Stripe now says it is complete and paid. */
    pay(sessionId: string, amountPence?: number, extra: Record<string, unknown> = {}) {
      const intent = `pi_test_${++ids}`;
      const s = sessions.get(sessionId)!;
      sessions.set(sessionId, { ...s, status: "complete", payment_status: "paid", payment_intent: intent, ...(amountPence === undefined ? {} : { amount_total: amountPence }), ...extra });
      return intent;
    },
    expire(sessionId: string) {
      sessions.set(sessionId, { ...sessions.get(sessionId)!, status: "expired" });
    },
    patch(sessionId: string, patch: Record<string, unknown>) {
      sessions.set(sessionId, { ...sessions.get(sessionId)!, ...patch });
    },
    refund(paymentIntent: string, amountPence: number, status = "succeeded") {
      const id = `re_test_${++ids}`;
      refunds.set(id, { id, object: "refund", status, payment_intent: paymentIntent, amount: amountPence, currency: "gbp", created: created() + 86_400 });
      return id;
    },
  };
}

export type StripeStandIn = ReturnType<typeof stripeStandIn>;

/** A signed Stripe event body and its Stripe-Signature header. */
export function signedEvent(event: Record<string, unknown>, secret = testWebhook.signingSecret, timestamp = Math.floor(Date.now() / 1000)) {
  const raw = JSON.stringify(event);
  return { raw, signature: `t=${timestamp},v1=${stripeSignature(raw, secret, timestamp)}`, timestamp };
}

let eventCounter = 0;
/** Delivers a signed event of `type` about `objectId` to the webhook handler. */
export function deliverStripeEvent(db: Db, api: StripeStandIn, type: string, object: Record<string, unknown>, eventId = `evt_test_${++eventCounter}`, config: StripeConfig = testStripe) {
  const { raw, signature, timestamp } = signedEvent({ id: eventId, object: "event", type, created: 1_792_000_000, data: { object } });
  return handleStripeWebhook(db, config, testWebhook, raw, signature, api.fetchImpl, timestamp);
}
