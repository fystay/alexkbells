import { inList, insert, remove, searchTerm, select, selectOne, update, type Db, type DbResult } from "./db";
import type { ActivityEvent, Client, ClientBalance, ClientStatus, Consent, ConsentKind, ContactMethod, FollowUp, ServiceKey } from "./types";

export const CLIENT_STATUSES: readonly ClientStatus[] = ["lead", "active", "paused", "former"];
export const CONTACT_METHODS: readonly Exclude<ContactMethod, "">[] = ["email", "phone", "instagram"];

export interface ClientInput {
  full_name: string;
  email: string;
  phone: string;
  instagram: string;
  preferred_contact: ContactMethod;
  status: ClientStatus;
  notes: string;
}

export type ClientSort = "name" | "newest" | "oldest";

/** Search by name, email or phone; filter by status. Service filtering is applied by the caller (see clientServices). */
export function listClients(db: Db, opts: { q?: string; status?: ClientStatus | ""; sort?: ClientSort; ids?: string[] } = {}): Promise<DbResult<Client[]>> {
  const query: [string, string][] = [];
  const q = searchTerm(opts.q ?? "");
  if (q) query.push(["or", `(full_name.ilike.*${q}*,email.ilike.*${q}*,phone.ilike.*${q}*)`]);
  if (opts.status) query.push(["status", `eq.${opts.status}`]);
  if (opts.ids) query.push(["id", inList(opts.ids)]);
  const order = { name: "full_name.asc", newest: "created_at.desc", oldest: "created_at.asc" }[opts.sort ?? "name"];
  query.push(["order", order], ["limit", "500"]);
  return select<Client>(db, "akb_clients", query);
}

export function getClient(db: Db, id: string): Promise<DbResult<Client | null>> {
  return selectOne<Client>(db, "akb_clients", id);
}

export async function createClient(db: Db, input: ClientInput): Promise<DbResult<Client>> {
  const result = await insert<Client>(db, "akb_clients", { ...input });
  return result.ok ? { ok: true, data: result.data[0] } : result;
}

export async function updateClient(db: Db, id: string, input: ClientInput): Promise<DbResult<Client | null>> {
  const result = await update<Client>(db, "akb_clients", [["id", `eq.${id}`]], { ...input, updated_at: new Date().toISOString() });
  return result.ok ? { ok: true, data: result.data[0] ?? null } : result;
}

/** Only works for someone with no history (the database refuses otherwise). */
export function deleteClient(db: Db, id: string): Promise<DbResult<null>> {
  return remove(db, "akb_clients", [["id", `eq.${id}`]]);
}

export async function clientBalances(db: Db, ids?: string[]): Promise<DbResult<Map<string, ClientBalance>>> {
  const result = await select<ClientBalance>(db, "akb_client_balances", ids ? [["client_id", inList(ids)]] : []);
  return result.ok ? { ok: true, data: new Map(result.data.map((b) => [b.client_id, b])) } : result;
}

/** Which services each client has used (bookings, sessions, subscriptions). */
export async function clientServices(db: Db): Promise<DbResult<Map<string, Set<ServiceKey>>>> {
  const [attendance, pt, online] = await Promise.all([
    select<{ client_id: string }>(db, "akb_class_attendance", [["select", "client_id"]]),
    select<{ client_id: string }>(db, "akb_pt_sessions", [["select", "client_id"]]),
    select<{ client_id: string }>(db, "akb_subscriptions", [["select", "client_id"]]),
  ]);
  for (const r of [attendance, pt, online]) if (!r.ok) return r;
  const map = new Map<string, Set<ServiceKey>>();
  const add = (rows: { client_id: string }[], service: ServiceKey) => {
    for (const { client_id } of rows) {
      if (!map.has(client_id)) map.set(client_id, new Set());
      map.get(client_id)!.add(service);
    }
  };
  if (attendance.ok) add(attendance.data, "group");
  if (pt.ok) add(pt.data, "pt");
  if (online.ok) add(online.data, "online");
  return { ok: true, data: map };
}

export function listConsents(db: Db, clientId: string): Promise<DbResult<Consent[]>> {
  return select<Consent>(db, "akb_client_consents", [["client_id", `eq.${clientId}`], ["order", "given_on.desc"]]);
}

export async function addConsent(db: Db, clientId: string, kind: ConsentKind, givenOn: string, source: string): Promise<DbResult<Consent>> {
  const result = await insert<Consent>(db, "akb_client_consents", { client_id: clientId, kind, given_on: givenOn, source });
  return result.ok ? { ok: true, data: result.data[0] } : result;
}

export async function withdrawConsent(db: Db, id: string, clientId: string, on: string): Promise<DbResult<Consent | null>> {
  const result = await update<Consent>(db, "akb_client_consents", [["id", `eq.${id}`], ["client_id", `eq.${clientId}`]], { withdrawn_on: on });
  return result.ok ? { ok: true, data: result.data[0] ?? null } : result;
}

export function listFollowUps(db: Db, opts: { clientId?: string; open?: boolean; dueBy?: string } = {}): Promise<DbResult<FollowUp[]>> {
  const query: [string, string][] = [];
  if (opts.clientId) query.push(["client_id", `eq.${opts.clientId}`]);
  if (opts.open) query.push(["done_at", "is.null"]);
  if (opts.dueBy) query.push(["due_on", `lte.${opts.dueBy}`]);
  query.push(["order", "due_on.asc"], ["limit", "200"]);
  return select<FollowUp>(db, "akb_follow_ups", query);
}

export async function addFollowUp(db: Db, clientId: string, dueOn: string, note: string): Promise<DbResult<FollowUp>> {
  const result = await insert<FollowUp>(db, "akb_follow_ups", { client_id: clientId, due_on: dueOn, note });
  return result.ok ? { ok: true, data: result.data[0] } : result;
}

export async function completeFollowUp(db: Db, id: string, clientId: string, done: boolean): Promise<DbResult<FollowUp | null>> {
  const result = await update<FollowUp>(db, "akb_follow_ups", [["id", `eq.${id}`], ["client_id", `eq.${clientId}`]], {
    done_at: done ? new Date().toISOString() : null,
  });
  return result.ok ? { ok: true, data: result.data[0] ?? null } : result;
}

export function clientEvents(db: Db, clientId: string, limit = 50): Promise<DbResult<ActivityEvent[]>> {
  return select<ActivityEvent>(db, "akb_events", [["client_id", `eq.${clientId}`], ["order", "created_at.desc"], ["limit", String(limit)]]);
}

export function entityEvents(db: Db, entityId: string, limit = 50): Promise<DbResult<ActivityEvent[]>> {
  return select<ActivityEvent>(db, "akb_events", [["entity_id", `eq.${entityId}`], ["order", "created_at.desc"], ["limit", String(limit)]]);
}

/** Notes the coach adds to the log by hand. */
export async function logEvent(db: Db, event: { client_id: string | null; entity: string; entity_id: string | null; action: string; detail?: Record<string, unknown> }): Promise<DbResult<null>> {
  const result = await insert(db, "akb_events", { ...event, detail: event.detail ?? {} });
  return result.ok ? { ok: true, data: null } : result;
}
