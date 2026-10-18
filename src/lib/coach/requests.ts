import { inList, rpc, searchTerm, select, selectOne, update, type Db, type DbResult } from "./db";
import type { BookingRequest, RequestStatus } from "./types";

export const REQUEST_STATUSES: readonly RequestStatus[] = ["new", "awaiting", "confirmed", "declined", "cancelled", "completed"];

/** Inbox tabs: "open" is everything still waiting on the coach. */
export const REQUEST_FILTERS = ["open", "new", "awaiting", "confirmed", "declined", "cancelled", "completed", "all"] as const;
export type RequestFilter = (typeof REQUEST_FILTERS)[number];

export function listRequests(db: Db, opts: { filter?: RequestFilter; q?: string; clientId?: string; classDate?: string; classSlot?: string; limit?: number } = {}): Promise<DbResult<BookingRequest[]>> {
  const query: [string, string][] = [];
  const filter = opts.filter ?? "all";
  if (filter === "open") query.push(["status", "in.(new,awaiting)"]);
  else if (filter !== "all") query.push(["status", `eq.${filter}`]);
  const q = searchTerm(opts.q ?? "");
  if (q) query.push(["or", `(name.ilike.*${q}*,email.ilike.*${q}*,phone.ilike.*${q}*,summary.ilike.*${q}*)`]);
  if (opts.clientId) query.push(["client_id", `eq.${opts.clientId}`]);
  if (opts.classDate) query.push(["class_date", `eq.${opts.classDate}`]);
  if (opts.classSlot) query.push(["class_slot", `eq.${opts.classSlot}`]);
  query.push(["order", "created_at.desc"], ["limit", String(opts.limit ?? 200)]);
  return select<BookingRequest>(db, "akb_booking_requests", query);
}

export function getRequest(db: Db, id: string): Promise<DbResult<BookingRequest | null>> {
  return selectOne<BookingRequest>(db, "akb_booking_requests", id);
}

/** Earlier requests from the same person: the linked client's, and any with the same email (case-insensitive). */
export async function relatedRequests(db: Db, request: BookingRequest): Promise<DbResult<BookingRequest[]>> {
  const base: [string, string][] = [["id", `neq.${request.id}`], ["order", "created_at.desc"], ["limit", "20"]];
  const lookups = [select<BookingRequest>(db, "akb_booking_requests", [["email", `ilike.${likeLiteral(request.email)}`], ...base])];
  if (request.client_id) lookups.push(select<BookingRequest>(db, "akb_booking_requests", [["client_id", `eq.${request.client_id}`], ...base]));
  const results = await Promise.all(lookups);
  const rows = new Map<string, BookingRequest>();
  for (const r of results) {
    if (!r.ok) return r;
    for (const row of r.data) rows.set(row.id, row);
  }
  return { ok: true, data: [...rows.values()].sort((a, b) => b.created_at.localeCompare(a.created_at)) };
}

/** An exact value for ilike: LIKE wildcards escaped, PostgREST's * removed. */
function likeLiteral(value: string): string {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`).replace(/\*/g, "");
}

export function requestsByIds(db: Db, ids: string[]): Promise<DbResult<BookingRequest[]>> {
  return select<BookingRequest>(db, "akb_booking_requests", [["id", inList(ids)]]);
}

/**
 * Moves a request on without booking anything: awaiting a reply, declined,
 * cancelled or completed. Only from the states where that makes sense, so a
 * double click or a stale page can't undo a decision.
 */
export async function setRequestStatus(db: Db, id: string, status: Exclude<RequestStatus, "new" | "confirmed">, note: string): Promise<DbResult<BookingRequest | null>> {
  const from: Record<typeof status, string> = {
    awaiting: "in.(new)",
    declined: "in.(new,awaiting)",
    cancelled: "in.(new,awaiting,confirmed)",
    completed: "in.(confirmed)",
  };
  const now = new Date().toISOString();
  const patch: Record<string, unknown> = { status, updated_at: now };
  if (status !== "awaiting") {
    patch.decided_at = now;
    patch.decision_note = note;
  } else if (note) {
    patch.decision_note = note;
  }
  const result = await update<BookingRequest>(db, "akb_booking_requests", [["id", `eq.${id}`], ["status", from[status]]], patch);
  return result.ok ? { ok: true, data: result.data[0] ?? null } : result;
}

export async function markNotified(db: Db, id: string): Promise<DbResult<BookingRequest | null>> {
  const result = await update<BookingRequest>(db, "akb_booking_requests", [["id", `eq.${id}`]], { notified_at: new Date().toISOString() });
  return result.ok ? { ok: true, data: result.data[0] ?? null } : result;
}

export async function linkRequestClient(db: Db, id: string, clientId: string): Promise<DbResult<BookingRequest | null>> {
  const result = await update<BookingRequest>(db, "akb_booking_requests", [["id", `eq.${id}`]], { client_id: clientId, updated_at: new Date().toISOString() });
  return result.ok ? { ok: true, data: result.data[0] ?? null } : result;
}

export type ConfirmBooking =
  | { kind: "class"; slot: string; date: string; starts_at: string; duration: number; price_pence: number; description: string }
  | { kind: "pt"; starts_at: string; ends_at: string; price_pence: number | null; package_id: string | null; description: string }
  | { kind: "none" };

/** Confirms a request in one transaction (akb_confirm_request): client, booking, status. */
export function confirmRequest(
  db: Db,
  args: { requestId: string; clientId: string | null; newClient: { full_name: string; email: string; phone: string } | null; booking: ConfirmBooking; note: string },
): Promise<DbResult<{ client_id: string; booked_id: string | null }>> {
  return rpc(db, "akb_confirm_request", {
    p_request: args.requestId,
    p_client: args.clientId,
    p_new_client: args.newClient,
    p_booking: args.booking,
    p_note: args.note,
  });
}

/** The parts of a request's details the portal uses. */
export function requestDetails(request: Pick<BookingRequest, "details">): { experience: string; classDate: string; classSlot: string; days: string; times: string; other: [string, string][] } {
  const d = request.details ?? {};
  const str = (key: string) => (typeof d[key] === "string" ? (d[key] as string) : "");
  const known = new Set(["experience", "classDate", "classSlot", "days", "times"]);
  return {
    experience: str("experience"),
    classDate: str("classDate"),
    classSlot: str("classSlot"),
    days: str("days"),
    times: str("times"),
    other: Object.entries(d)
      .filter(([k, v]) => !known.has(k) && typeof v === "string")
      .map(([k, v]) => [k, v as string]),
  };
}
