import type { BookingDeliveryConfig } from "./booking-request";
import type { SupabaseConfig } from "./env";
import { REQUESTS_TABLE } from "./request-store";
import { sendEmail, type OutgoingEmail, type SendResult } from "./send-email";

/**
 * Whether Alex's email alert for each stored request went (columns from
 * supabase/migrations/20261020000100_akb_request_alerts.sql), and one retry
 * path for those that didn't. The request itself is stored first and never
 * depends on any of this: if these columns are missing or the update fails,
 * the request is still in the coach area and only a log line is written.
 *
 * Duplicates: a retry sends the identical stored email with the request's
 * idempotency key, and only within the provider's 24-hour idempotency
 * window, so an alert the provider did accept (but whose answer was lost) is
 * not delivered twice. Older failures stay marked "failed" for the coach area.
 */

/** The provider keeps idempotency keys for 24 hours; stay inside that. */
export const RETRY_WINDOW_MS = 23 * 60 * 60 * 1000;
/** Leave the original send (and its outcome update) time to finish first. */
export const RETRY_MIN_AGE_MS = 5 * 60 * 1000;
export const MAX_ALERT_ATTEMPTS = 5;

type AlertEmail = Pick<OutgoingEmail, "subject" | "text">;

/** Short, non-identifying error code for logs and the alert_error column. */
export function alertError(result: SendResult): string {
  return result.ok ? "" : result.status === null ? "network" : `http-${result.status}`;
}

function headers(config: SupabaseConfig, extra: Record<string, string> = {}): HeadersInit {
  return { apikey: config.secretKey, "Content-Type": "application/json", ...extra };
}

async function patch(
  config: SupabaseConfig,
  filters: [string, string][],
  body: Record<string, unknown>,
  fetchImpl: typeof fetch,
): Promise<unknown[] | null> {
  const query = filters.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join("&");
  try {
    const response = await fetchImpl(`${config.url}/rest/v1/${REQUESTS_TABLE}?${query}`, {
      method: "PATCH",
      headers: headers(config, { Prefer: "return=representation" }),
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return null;
    const rows: unknown = await response.json();
    return Array.isArray(rows) ? rows : null;
  } catch {
    return null;
  }
}

/**
 * Records the first send's outcome on the stored request. A resubmission of
 * the same request can turn "failed" into "sent" but never resets a sent one.
 */
export async function recordAlert(
  config: SupabaseConfig,
  idempotencyKey: string,
  email: AlertEmail,
  result: SendResult,
  now: Date = new Date(),
  fetchImpl: typeof fetch = fetch,
): Promise<boolean> {
  const content = { alert_subject: email.subject.slice(0, 150), alert_text: email.text.slice(0, 10_000) };
  const rows = result.ok
    ? await patch(
        config,
        [["idempotency_key", `eq.${idempotencyKey}`], ["or", "(alert_status.is.null,alert_status.eq.failed)"]],
        { ...content, alert_status: "sent", alert_sent_at: now.toISOString(), alert_error: "" },
        fetchImpl,
      )
    : await patch(
        config,
        [["idempotency_key", `eq.${idempotencyKey}`], ["alert_status", "is.null"]],
        { ...content, alert_status: "failed", alert_attempts: 1, alert_error: alertError(result) },
        fetchImpl,
      );
  return rows !== null;
}

interface FailedAlert {
  id: string;
  idempotency_key: string;
  kind: string;
  email: string;
  alert_subject: string;
  alert_text: string;
  alert_attempts: number;
}

function toFailedAlert(raw: unknown): FailedAlert | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const ok =
    typeof r.id === "string" &&
    typeof r.idempotency_key === "string" &&
    typeof r.email === "string" &&
    typeof r.alert_subject === "string" &&
    typeof r.alert_text === "string" &&
    typeof r.alert_attempts === "number";
  return ok ? (r as unknown as FailedAlert) : null;
}

export interface RetrySummary {
  /** False when the failed alerts couldn't be read at all. */
  ok: boolean;
  found: number;
  sent: number;
  failed: number;
}

/**
 * Resends failed alerts from the last 23 hours, oldest first. Each row is
 * claimed by bumping alert_attempts from the value just read, so two runs at
 * once never both send the same alert.
 */
export async function retryFailedAlerts(
  store: SupabaseConfig,
  mail: BookingDeliveryConfig,
  { now = new Date(), limit = 20, fetchImpl = fetch }: { now?: Date; limit?: number; fetchImpl?: typeof fetch } = {},
): Promise<RetrySummary> {
  const from = new Date(now.getTime() - RETRY_WINDOW_MS).toISOString();
  const until = new Date(now.getTime() - RETRY_MIN_AGE_MS).toISOString();
  const query = new URLSearchParams([
    ["select", "id,idempotency_key,kind,email,alert_subject,alert_text,alert_attempts"],
    ["alert_status", "eq.failed"],
    ["alert_attempts", `lt.${MAX_ALERT_ATTEMPTS}`],
    // Repeated filters on one column are ANDed by PostgREST.
    ["created_at", `gt.${from}`],
    ["created_at", `lt.${until}`],
    ["order", "created_at.asc"],
    ["limit", String(limit)],
  ]);
  let rows: FailedAlert[];
  try {
    const response = await fetchImpl(`${store.url}/rest/v1/${REQUESTS_TABLE}?${query}`, {
      headers: headers(store),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return { ok: false, found: 0, sent: 0, failed: 0 };
    const body: unknown = await response.json();
    rows = Array.isArray(body) ? body.map(toFailedAlert).filter((r): r is FailedAlert => r !== null) : [];
  } catch {
    return { ok: false, found: 0, sent: 0, failed: 0 };
  }

  const summary: RetrySummary = { ok: true, found: rows.length, sent: 0, failed: 0 };
  for (const row of rows) {
    const claimed = await patch(
      store,
      [["id", `eq.${row.id}`], ["alert_status", "eq.failed"], ["alert_attempts", `eq.${row.alert_attempts}`]],
      { alert_attempts: row.alert_attempts + 1 },
      fetchImpl,
    );
    if (!claimed || claimed.length === 0) continue;
    const result = await sendEmail(
      mail,
      { subject: row.alert_subject, text: row.alert_text, replyTo: row.email, idempotencyKey: row.idempotency_key },
      fetchImpl,
    );
    const update = result.ok
      ? { alert_status: "sent", alert_sent_at: new Date().toISOString(), alert_error: "" }
      : { alert_error: alertError(result) };
    const saved = await patch(store, [["id", `eq.${row.id}`], ["alert_status", "eq.failed"]], update, fetchImpl);
    if (result.ok) summary.sent += 1;
    else summary.failed += 1;
    // Request id and an error code only: no names, emails or provider text.
    if (!result.ok) console.error(`Retrying a request alert (${row.kind}, ${row.id}) failed: ${alertError(result)}`);
    if (!saved) console.error(`Recording a retried request alert (${row.kind}, ${row.id}) failed`);
  }
  return summary;
}
