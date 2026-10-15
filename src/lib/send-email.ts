import type { BookingDeliveryConfig } from "./booking-request";

export interface OutgoingEmail {
  subject: string;
  text: string;
  replyTo: string;
  /** Same key for a retried identical request, so it is only sent once. */
  idempotencyKey: string;
}

export type SendResult = { ok: true } | { ok: false; status: number | null };

/**
 * Sends an email through Resend's REST API (POST /emails). Plain fetch: no
 * SDK dependency. Success only when the provider accepts the message.
 */
export async function sendEmail(
  config: BookingDeliveryConfig,
  email: OutgoingEmail,
  fetchImpl: typeof fetch = fetch,
): Promise<SendResult> {
  try {
    const response = await fetchImpl(config.endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": email.idempotencyKey,
      },
      body: JSON.stringify({
        from: config.from,
        to: [config.to],
        reply_to: email.replyTo,
        subject: email.subject,
        text: email.text,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    return response.ok ? { ok: true } : { ok: false, status: response.status };
  } catch {
    return { ok: false, status: null };
  }
}

/** Deterministic key: identical resubmissions (double clicks, retries) dedupe. */
export async function idempotencyKey(parts: string[]): Promise<string> {
  const bytes = new TextEncoder().encode(parts.join("\u0000"));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const hex = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
  return `booking-request/${hex}`;
}
