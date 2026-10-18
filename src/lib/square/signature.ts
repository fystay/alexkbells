import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Square webhook signature: base64(HMAC-SHA256(signature key, notification URL
 * + raw request body)), sent as x-square-hmacsha256-signature. Matches the
 * official SDK's WebhooksHelper.verifySignature (square@46), but compares in
 * constant time. The body must be the exact bytes received, before parsing.
 */
export function squareSignature(rawBody: string, signatureKey: string, notificationUrl: string): string {
  return createHmac("sha256", signatureKey).update(notificationUrl + rawBody, "utf8").digest("base64");
}

export function verifySquareSignature(rawBody: string, header: string | null, signatureKey: string, notificationUrl: string): boolean {
  if (!header || !signatureKey || !notificationUrl) return false;
  const expected = Buffer.from(squareSignature(rawBody, signatureKey, notificationUrl));
  const given = Buffer.from(header.trim());
  return given.length === expected.length && timingSafeEqual(given, expected);
}
