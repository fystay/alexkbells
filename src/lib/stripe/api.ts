import { STRIPE_API_VERSION, type StripeConfig } from "./config";

/**
 * The few Stripe REST calls the site makes, with plain fetch (no SDK, like
 * Supabase and Resend). Errors are reduced to an HTTP status: Stripe's error
 * text and the secret key never reach logs or the browser.
 */

export type StripeResult<T> = { ok: true; data: T } | { ok: false; status: number | null };

interface Form {
  [key: string]: string | number | boolean | undefined | Form;
}

/** Stripe takes form bodies with bracketed keys: a[b][0]=c. */
function encode(form: Form, prefix = "", out: URLSearchParams = new URLSearchParams()): URLSearchParams {
  for (const [key, value] of Object.entries(form)) {
    if (value === undefined) continue;
    const name = prefix ? `${prefix}[${key}]` : key;
    if (typeof value === "object") encode(value, name, out);
    else out.append(name, String(value));
  }
  return out;
}

async function call<T>(
  config: StripeConfig,
  method: "GET" | "POST",
  path: string,
  form: Form | undefined,
  read: (json: unknown) => T | null,
  fetchImpl: typeof fetch,
  idempotencyKey?: string,
): Promise<StripeResult<T>> {
  try {
    const query = method === "GET" && form ? `?${encode(form)}` : "";
    const response = await fetchImpl(`${config.baseUrl}${path}${query}`, {
      method,
      headers: {
        Authorization: `Bearer ${config.secretKey}`,
        "Stripe-Version": STRIPE_API_VERSION,
        Accept: "application/json",
        ...(method === "POST" ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
        ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey.slice(0, 255) } : {}),
      },
      body: method === "POST" && form ? encode(form).toString() : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return { ok: false, status: response.status };
    const data = read(await response.json());
    return data ? { ok: true, data } : { ok: false, status: 502 };
  } catch {
    return { ok: false, status: null };
  }
}

const obj = (v: unknown): Record<string, unknown> | null => (typeof v === "object" && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : null);
const str = (v: unknown): string | null => (typeof v === "string" && v.length > 0 ? v : null);
const int = (v: unknown): number | null => (typeof v === "number" && Number.isInteger(v) ? v : null);
const iso = (unixSeconds: unknown): string | null => {
  const n = int(unixSeconds);
  return n === null ? null : new Date(n * 1000).toISOString();
};

/** A Stripe id from either the id itself or an expanded object. */
const idOf = (v: unknown): string | null => str(v) ?? str(obj(v)?.id);

export interface CheckoutSessionLink {
  id: string;
  url: string;
}

/**
 * Stripe-hosted checkout for one card payment in GBP. The idempotency key makes
 * a retried call return the same session. successUrl: where Stripe sends the
 * buyer after paying (only a "thanks" page: payment state always comes from
 * the signed webhook). `savePaymentMethod` keeps the card for the membership's
 * later set-up step.
 */
export function createPaymentSession(
  config: StripeConfig,
  args: { idempotencyKey: string; name: string; amountPence: number; note: string; buyerEmail?: string; successUrl: string; cancelUrl: string; customerId?: string; metadata?: Record<string, string> },
  fetchImpl: typeof fetch = fetch,
): Promise<StripeResult<CheckoutSessionLink>> {
  return call(
    config,
    "POST",
    "/v1/checkout/sessions",
    {
      mode: "payment",
      payment_method_types: { 0: "card" },
      line_items: { 0: { quantity: 1, price_data: { currency: "gbp", unit_amount: args.amountPence, product_data: { name: args.name.slice(0, 250) } } } },
      success_url: args.successUrl,
      cancel_url: args.cancelUrl,
      ...(args.customerId ? { customer: args.customerId } : args.buyerEmail ? { customer_email: args.buyerEmail } : {}),
      payment_intent_data: { description: args.note.slice(0, 500) },
      ...(args.metadata ? { metadata: args.metadata } : {}),
    },
    (json) => {
      const s = obj(json);
      const id = str(s?.id);
      const url = str(s?.url);
      // Stripe's pages are https; the localhost API stand-in (tests only) serves its own checkout page.
      const ok = url?.startsWith("https://") || (config.baseUrl.startsWith("http://localhost:") && url?.startsWith("http://localhost:"));
      return id && url && ok ? { id, url } : null;
    },
    fetchImpl,
    args.idempotencyKey,
  );
}

export interface CheckoutSession {
  id: string;
  mode: string;
  /** "open" | "complete" | "expired" */
  status: string;
  /** "paid" | "unpaid" | "no_payment_required" */
  paymentStatus: string;
  paymentIntentId: string | null;
  amountPence: number;
  currency: string;
  createdAt: string;
  customerId: string | null;
  setupIntentId: string | null;
  clientReference: string | null;
}

function readSession(json: unknown): CheckoutSession | null {
  const s = obj(json);
  const id = str(s?.id);
  const createdAt = iso(s?.created);
  if (!s || !id || !createdAt) return null;
  return {
    id,
    mode: str(s.mode) ?? "payment",
    status: str(s.status) ?? "open",
    paymentStatus: str(s.payment_status) ?? "unpaid",
    paymentIntentId: idOf(s.payment_intent),
    amountPence: int(s.amount_total) ?? 0,
    currency: (str(s.currency) ?? "gbp").toUpperCase(),
    createdAt,
    customerId: idOf(s.customer),
    setupIntentId: idOf(s.setup_intent),
    clientReference: str(s.client_reference_id),
  };
}

export function getCheckoutSession(config: StripeConfig, id: string, fetchImpl: typeof fetch = fetch): Promise<StripeResult<CheckoutSession>> {
  return call(config, "GET", `/v1/checkout/sessions/${encodeURIComponent(id)}`, undefined, readSession, fetchImpl);
}

/** The checkout session(s) that created a payment (to find a refund's payment). */
export function listSessionsForPaymentIntent(config: StripeConfig, paymentIntentId: string, fetchImpl: typeof fetch = fetch): Promise<StripeResult<CheckoutSession[]>> {
  return call(config, "GET", "/v1/checkout/sessions", { payment_intent: paymentIntentId, limit: 5 }, (json) => {
    const data = obj(json)?.data;
    return Array.isArray(data) ? data.map(readSession).filter((s): s is CheckoutSession => s !== null) : null;
  }, fetchImpl);
}

export interface StripeRefund {
  id: string;
  /** "succeeded" | "pending" | "failed" | "canceled" | "requires_action" */
  status: string;
  paymentIntentId: string;
  amountPence: number;
  currency: string;
  createdAt: string;
}

function readRefund(json: unknown): StripeRefund | null {
  const r = obj(json);
  const id = str(r?.id);
  const status = str(r?.status);
  const paymentIntentId = idOf(r?.payment_intent);
  const amount = int(r?.amount);
  const currency = str(r?.currency);
  const createdAt = iso(r?.created);
  if (!id || !status || !paymentIntentId || amount === null || !currency || !createdAt) return null;
  return { id, status, paymentIntentId, amountPence: amount, currency: currency.toUpperCase(), createdAt };
}

export function getRefund(config: StripeConfig, id: string, fetchImpl: typeof fetch = fetch): Promise<StripeResult<StripeRefund>> {
  return call(config, "GET", `/v1/refunds/${encodeURIComponent(id)}`, undefined, readRefund, fetchImpl);
}

export function listRefundsForPaymentIntent(config: StripeConfig, paymentIntentId: string, fetchImpl: typeof fetch = fetch): Promise<StripeResult<StripeRefund[]>> {
  return call(config, "GET", "/v1/refunds", { payment_intent: paymentIntentId, limit: 20 }, (json) => {
    const data = obj(json)?.data;
    return Array.isArray(data) ? data.map(readRefund).filter((r): r is StripeRefund => r !== null) : null;
  }, fetchImpl);
}
