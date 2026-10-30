import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Stripe webhook signature: the Stripe-Signature header holds `t=<unix time>`
 * and one or more `v1=<hex>`, where v1 is HMAC-SHA256(signing secret,
 * `${t}.${raw request body}`). The body must be the exact bytes received,
 * before parsing. Compared in constant time; a timestamp more than five
 * minutes from now is refused so a captured request can't be replayed later.
 */
export const SIGNATURE_TOLERANCE_SECONDS = 300;

export function stripeSignature(rawBody: string, secret: string, timestamp: number): string {
  return createHmac("sha256", secret).update(`${timestamp}.${rawBody}`, "utf8").digest("hex");
}

export function verifyStripeSignature(rawBody: string, header: string | null, secret: string, nowSeconds: number = Math.floor(Date.now() / 1000)): boolean {
  if (!header || !secret) return false;
  let timestamp = NaN;
  const candidates: string[] = [];
  for (const part of header.split(",")) {
    const [k, v] = part.trim().split("=");
    if (k === "t") timestamp = Number(v);
    else if (k === "v1" && v) candidates.push(v);
  }
  if (!Number.isInteger(timestamp) || Math.abs(nowSeconds - timestamp) > SIGNATURE_TOLERANCE_SECONDS) return false;
  const expected = Buffer.from(stripeSignature(rawBody, secret, timestamp));
  return candidates.some((c) => {
    const given = Buffer.from(c);
    return given.length === expected.length && timingSafeEqual(given, expected);
  });
}
