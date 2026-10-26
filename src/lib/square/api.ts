import { SQUARE_API_VERSION, type SquareConfig } from "./config";

/**
 * The few Square REST calls the site makes, with plain fetch (no SDK, like
 * Supabase and Resend). Errors are reduced to an HTTP status: Square's error
 * text and the access token never reach logs or the browser.
 */

export type SquareResult<T> = { ok: true; data: T } | { ok: false; status: number | null };

async function call<T>(config: SquareConfig, method: "GET" | "POST", path: string, body: unknown, read: (json: unknown) => T | null, fetchImpl: typeof fetch): Promise<SquareResult<T>> {
  try {
    const response = await fetchImpl(`${config.baseUrl}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        "Square-Version": SQUARE_API_VERSION,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
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

interface Money {
  amountPence: number;
  currency: string;
}

function money(v: unknown): Money | null {
  const m = obj(v);
  if (!m || typeof m.amount !== "number" || !Number.isInteger(m.amount) || typeof m.currency !== "string") return null;
  return { amountPence: m.amount, currency: m.currency };
}

export interface PaymentLink {
  id: string;
  orderId: string;
  url: string;
}

/**
 * Square-hosted checkout for one amount. The idempotency key makes a retried
 * call return the same link. redirectUrl: where Square sends the buyer after
 * paying (only a "thanks" page: payment state always comes from the webhook).
 */
export function createPaymentLink(
  config: SquareConfig,
  args: { idempotencyKey: string; name: string; amountPence: number; note: string; buyerEmail?: string; redirectUrl?: string },
  fetchImpl: typeof fetch = fetch,
): Promise<SquareResult<PaymentLink>> {
  return call(
    config,
    "POST",
    "/v2/online-checkout/payment-links",
    {
      idempotency_key: args.idempotencyKey,
      quick_pay: { name: args.name.slice(0, 255), price_money: { amount: args.amountPence, currency: "GBP" }, location_id: config.locationId },
      payment_note: args.note.slice(0, 500),
      ...(args.buyerEmail ? { pre_populated_data: { buyer_email: args.buyerEmail } } : {}),
      ...(args.redirectUrl ? { checkout_options: { redirect_url: args.redirectUrl } } : {}),
    },
    (json) => {
      const link = obj(obj(json)?.payment_link);
      const id = str(link?.id);
      const orderId = str(link?.order_id);
      const url = str(link?.url);
      // Square's links are https; the localhost API stand-in (tests only) serves its own checkout page.
      const ok = url?.startsWith("https://") || (config.baseUrl.startsWith("http://localhost:") && url?.startsWith("http://localhost:"));
      return id && orderId && url && ok ? { id, orderId, url } : null;
    },
    fetchImpl,
  );
}

export interface SquarePayment {
  id: string;
  status: string;
  orderId: string | null;
  locationId: string | null;
  total: Money;
  createdAt: string;
}

export function getPayment(config: SquareConfig, id: string, fetchImpl: typeof fetch = fetch): Promise<SquareResult<SquarePayment>> {
  return call(config, "GET", `/v2/payments/${encodeURIComponent(id)}`, undefined, (json) => {
    const p = obj(obj(json)?.payment);
    const pid = str(p?.id);
    const status = str(p?.status);
    const total = money(p?.total_money) ?? money(p?.amount_money);
    const createdAt = str(p?.created_at);
    if (!pid || !status || !total || !createdAt) return null;
    return { id: pid, status, orderId: str(p?.order_id), locationId: str(p?.location_id), total, createdAt };
  }, fetchImpl);
}

export interface SquareRefund {
  id: string;
  status: string;
  paymentId: string;
  locationId: string | null;
  amount: Money;
  createdAt: string;
}

export function getRefund(config: SquareConfig, id: string, fetchImpl: typeof fetch = fetch): Promise<SquareResult<SquareRefund>> {
  return call(config, "GET", `/v2/refunds/${encodeURIComponent(id)}`, undefined, (json) => {
    const r = obj(obj(json)?.refund);
    const rid = str(r?.id);
    const status = str(r?.status);
    const paymentId = str(r?.payment_id);
    const amount = money(r?.amount_money);
    const createdAt = str(r?.created_at);
    if (!rid || !status || !paymentId || !amount || !createdAt) return null;
    return { id: rid, status, paymentId, locationId: str(r?.location_id), amount, createdAt };
  }, fetchImpl);
}

/** The payment ids tendered against an order (for reconciling a link whose webhook never arrived). */
export function getOrderPaymentIds(config: SquareConfig, orderId: string, fetchImpl: typeof fetch = fetch): Promise<SquareResult<string[]>> {
  return call(config, "GET", `/v2/orders/${encodeURIComponent(orderId)}`, undefined, (json) => {
    const order = obj(obj(json)?.order);
    if (!order) return null;
    const tenders = Array.isArray(order.tenders) ? order.tenders : [];
    return tenders.map((t) => str(obj(t)?.payment_id)).filter((id): id is string => id !== null);
  }, fetchImpl);
}
