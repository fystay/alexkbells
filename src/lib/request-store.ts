import { supabaseConfig, type Env, type SupabaseConfig } from "./env";

/**
 * Booking requests and online coaching enquiries stored in Supabase
 * (table akb_booking_requests, supabase/migrations/). Plain fetch to the
 * PostgREST API with the secret key, on the server only. RLS is on with no
 * policies, so nothing but this server code can read or write the table.
 */

export const REQUESTS_TABLE = "akb_booking_requests";

export interface StoredRequest {
  /** Same key for a retried identical submission, so it is stored once. */
  idempotencyKey: string;
  kind: "booking" | "online";
  /** "Group class", "One-to-one" or "Online coaching". */
  service: string;
  /** What they asked for in one line, e.g. "Saturday 24 October 2026, 10:15 am". */
  summary: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  /** Everything else from the form, for the coach area. */
  details: Record<string, string>;
}

export interface RequestRow extends Omit<StoredRequest, "idempotencyKey"> {
  id: string;
  createdAt: string;
}

/** Null unless Supabase is configured. */
export function requestStoreConfig(env: Env = process.env): SupabaseConfig | null {
  return supabaseConfig(env);
}

function headers(config: SupabaseConfig, extra: Record<string, string> = {}): HeadersInit {
  return { apikey: config.secretKey, "Content-Type": "application/json", ...extra };
}

/** True once the row is stored (or was already stored by an identical earlier submission). */
export async function saveRequest(config: SupabaseConfig, request: StoredRequest, fetchImpl: typeof fetch = fetch): Promise<boolean> {
  try {
    const response = await fetchImpl(`${config.url}/rest/v1/${REQUESTS_TABLE}?on_conflict=idempotency_key`, {
      method: "POST",
      headers: headers(config, { Prefer: "resolution=ignore-duplicates,return=minimal" }),
      body: JSON.stringify({
        idempotency_key: request.idempotencyKey,
        kind: request.kind,
        service: request.service,
        summary: request.summary,
        name: request.name,
        email: request.email,
        phone: request.phone,
        message: request.message,
        details: request.details,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

function toRow(raw: unknown): RequestRow | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  if (typeof r.id !== "string" || typeof r.created_at !== "string") return null;
  const details = typeof r.details === "object" && r.details !== null ? (r.details as Record<string, unknown>) : {};
  return {
    id: r.id,
    createdAt: r.created_at,
    kind: r.kind === "online" ? "online" : "booking",
    service: str(r.service),
    summary: str(r.summary),
    name: str(r.name),
    email: str(r.email),
    phone: str(r.phone),
    message: str(r.message),
    details: Object.fromEntries(Object.entries(details).filter((e): e is [string, string] => typeof e[1] === "string")),
  };
}

/** Newest first. Null when the store can't be read. */
export async function listRequests(config: SupabaseConfig, limit = 100, fetchImpl: typeof fetch = fetch): Promise<RequestRow[] | null> {
  try {
    const response = await fetchImpl(`${config.url}/rest/v1/${REQUESTS_TABLE}?select=*&order=created_at.desc&limit=${limit}`, {
      headers: headers(config),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) return null;
    const body: unknown = await response.json();
    return Array.isArray(body) ? body.map(toRow).filter((r): r is RequestRow => r !== null) : null;
  } catch {
    return null;
  }
}
