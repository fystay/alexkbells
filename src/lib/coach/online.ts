import { inList, insert, rpc, select, selectOne, update, type Db, type DbResult } from "./db";
import type { CheckIn, Subscription, SubscriptionStatus } from "./types";

export const SUBSCRIPTION_STATUSES: readonly SubscriptionStatus[] = ["active", "paused", "cancelled", "completed"];

export interface SubscriptionInput {
  plan: string;
  price_pence: number;
  start_on: string;
  end_on: string | null;
  renews_on: string | null;
  status: SubscriptionStatus;
  check_in_days: number;
  next_check_in_on: string | null;
  notes: string;
}

export function listSubscriptions(db: Db, opts: { clientId?: string; status?: SubscriptionStatus | "" } = {}): Promise<DbResult<Subscription[]>> {
  const query: [string, string][] = [];
  if (opts.clientId) query.push(["client_id", `eq.${opts.clientId}`]);
  if (opts.status) query.push(["status", `eq.${opts.status}`]);
  query.push(["order", "start_on.desc"], ["limit", "500"]);
  return select<Subscription>(db, "akb_subscriptions", query);
}

export function getSubscription(db: Db, id: string): Promise<DbResult<Subscription | null>> {
  return selectOne<Subscription>(db, "akb_subscriptions", id);
}

export async function createSubscription(db: Db, clientId: string, input: SubscriptionInput): Promise<DbResult<Subscription>> {
  const result = await insert<Subscription>(db, "akb_subscriptions", { client_id: clientId, ...input });
  return result.ok ? { ok: true, data: result.data[0] } : result;
}

export async function updateSubscription(db: Db, id: string, input: SubscriptionInput): Promise<DbResult<Subscription | null>> {
  const result = await update<Subscription>(db, "akb_subscriptions", [["id", `eq.${id}`]], { ...input, updated_at: new Date().toISOString() });
  return result.ok ? { ok: true, data: result.data[0] ?? null } : result;
}

export function listCheckIns(db: Db, opts: { subscriptionIds?: string[]; limit?: number }): Promise<DbResult<CheckIn[]>> {
  const query: [string, string][] = [];
  if (opts.subscriptionIds) query.push(["subscription_id", inList(opts.subscriptionIds)]);
  query.push(["order", "checked_in_on.desc,created_at.desc"], ["limit", String(opts.limit ?? 500)]);
  return select<CheckIn>(db, "akb_check_ins", query);
}

/** Logs a check-in; the database moves the next check-in date on. */
export async function addCheckIn(db: Db, subscriptionId: string, args: { checkedInOn: string; summary: string; actions: string }): Promise<DbResult<CheckIn>> {
  const result = await insert<CheckIn>(db, "akb_check_ins", {
    subscription_id: subscriptionId,
    checked_in_on: args.checkedInOn,
    summary: args.summary,
    actions: args.actions,
  });
  return result.ok ? { ok: true, data: result.data[0] } : result;
}

/** Raises this period's charge and moves the renewal date on a month (once per period). */
export function chargeSubscriptionPeriod(db: Db, id: string): Promise<DbResult<string>> {
  return rpc<string>(db, "akb_charge_subscription_period", { p_subscription: id });
}
