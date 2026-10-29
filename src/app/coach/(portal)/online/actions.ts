"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { failure, success, type ActionState } from "@/lib/coach/action-state";
import { getClient } from "@/lib/coach/clients";
import { actionContext } from "@/lib/coach/context";
import { dbMessage } from "@/lib/coach/errors";
import { addCheckIn, chargeSubscriptionPeriod, createSubscription, getSubscription, messageClient, replyToCheckIn, saveProgramme, SUBSCRIPTION_STATUSES, updateSubscription, type SubscriptionInput } from "@/lib/coach/online";
import { parseProgramme } from "@/lib/coach/programme-text";
import { addDays } from "@/lib/coach/time";
import { FormReader } from "@/lib/coach/validate";

const CHECK = "Please check the highlighted fields.";

function readSubscription(form: FormReader, today: string): SubscriptionInput | null {
  const plan = form.text("plan", { label: "the plan name", max: 100, required: true });
  const price = form.pounds("price", { label: "the monthly price", required: true, allowZero: true });
  const startOn = form.date("start_on", { label: "the start date", required: true });
  const endOn = form.date("end_on", { label: "the end date" });
  const renewsOn = form.date("renews_on", { label: "the renewal date" });
  const status = form.oneOf("status", SUBSCRIPTION_STATUSES, { label: "a status", required: true });
  const every = form.int("check_in_days", { label: "days between check-ins", min: 1, max: 90, required: true });
  const nextCheckIn = form.date("next_check_in_on", { label: "the next check-in date" });
  const notes = form.text("notes", { label: "the notes", max: 2000, multiline: true });
  if (startOn && endOn && endOn < startOn) form.error("end_on", "The end date must be after the start date.");
  if (!form.ok || price === null || every === null || !status) return null;
  return {
    plan,
    price_pence: price,
    start_on: startOn,
    end_on: endOn || null,
    renews_on: renewsOn || null,
    status,
    check_in_days: every,
    next_check_in_on: nextCheckIn || (status === "active" ? addDays(startOn > today ? startOn : today, every) : null),
    notes,
  };
}

export async function createSubscriptionAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await actionContext();
  if ("error" in ctx) return ctx.error;
  const form = new FormReader(formData);
  const clientId = form.id("client", { label: "a client", required: true });
  const input = readSubscription(form, ctx.today);
  if (!form.ok || !input) return failure(CHECK, form.errors);
  const client = await getClient(ctx.db, clientId);
  if (!client.ok) return failure(dbMessage(client.error));
  if (!client.data) return failure("That client no longer exists.", { client: "Choose a client." });
  const result = await createSubscription(ctx.db, clientId, input);
  if (!result.ok) return failure(dbMessage(result.error));
  redirect(`/coach/online/${result.data.id}`);
}

export async function updateSubscriptionAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await actionContext();
  if ("error" in ctx) return ctx.error;
  const form = new FormReader(formData);
  const id = form.id("subscription", { label: "a plan", required: true });
  const input = readSubscription(form, ctx.today);
  if (!form.ok || !input) return failure(CHECK, form.errors);
  const result = await updateSubscription(ctx.db, id, input);
  if (!result.ok) return failure(dbMessage(result.error));
  if (!result.data) return failure("That plan no longer exists.");
  refresh();
  return success("Saved.");
}

export async function checkInAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await actionContext();
  if ("error" in ctx) return ctx.error;
  const form = new FormReader(formData);
  const id = form.id("subscription", { label: "a plan", required: true });
  const on = form.date("checked_in_on", { label: "the date", required: true });
  const summary = form.text("summary", { label: "how it went", max: 2000, required: true, multiline: true });
  const actions = form.text("actions", { label: "the agreed actions", max: 2000, multiline: true });
  if (on && on > ctx.today) form.error("checked_in_on", "A check-in can't be in the future.");
  if (!form.ok) return failure(CHECK, form.errors);
  const sub = await getSubscription(ctx.db, id);
  if (!sub.ok) return failure(dbMessage(sub.error));
  if (!sub.data) return failure("That plan no longer exists.");
  const result = await addCheckIn(ctx.db, id, { checkedInOn: on, summary, actions });
  if (!result.ok) return failure(dbMessage(result.error));
  refresh();
  return success("Check-in logged. The next one is scheduled.");
}

export async function chargePeriodAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await actionContext();
  if ("error" in ctx) return ctx.error;
  const form = new FormReader(formData);
  const id = form.id("subscription", { label: "a plan", required: true });
  if (!form.ok) return failure("That plan no longer exists.");
  const result = await chargeSubscriptionPeriod(ctx.db, id);
  if (!result.ok) return failure(dbMessage(result.error));
  refresh();
  return success("Charge added for this period. Record the payment when it arrives.");
}

/**
 * Writes (or rewrites) the client's programme for their coaching area. The
 * text is checked line by line; what the client has already logged stays.
 */
export async function saveProgrammeAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await actionContext();
  if ("error" in ctx) return ctx.error;
  const form = new FormReader(formData);
  const id = form.id("subscription", { label: "a plan", required: true });
  const name = form.text("name", { label: "the programme name", max: 80, required: true });
  const goal = form.text("goal", { label: "the goal", max: 200 });
  const weeks = form.int("weeks", { label: "the number of weeks", min: 1, max: 12, required: true });
  const days = form.int("days_per_week", { label: "days a week", min: 1, max: 7, required: true });
  const startsOn = form.date("starts_on", { label: "the start date", required: true });
  const text = form.text("programme", { label: "the programme", max: 30000, required: true, multiline: true });
  if (!form.ok || weeks === null || days === null) return failure(CHECK, form.errors);
  const parsed = parseProgramme(text, weeks);
  if (!parsed.ok) return failure(CHECK, { programme: parsed.error });
  const result = await saveProgramme(ctx.db, id, { name, goal, weeks, daysPerWeek: days, startsOn, items: parsed.items });
  if (!result.ok) return failure(dbMessage(result.error));
  refresh();
  return success("Programme saved. The client sees it in their coaching area.");
}

export async function replyCheckInAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await actionContext();
  if ("error" in ctx) return ctx.error;
  const form = new FormReader(formData);
  const id = form.id("check_in", { label: "a check-in", required: true });
  const reply = form.text("reply", { label: "your reply", max: 1000, required: true, multiline: true });
  if (!form.ok) return failure(CHECK, form.errors);
  const result = await replyToCheckIn(ctx.db, id, reply);
  if (!result.ok) return failure(dbMessage(result.error));
  refresh();
  return success("Reply sent. The client sees it with their check-in.");
}

export async function messageClientAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await actionContext();
  if ("error" in ctx) return ctx.error;
  const form = new FormReader(formData);
  const id = form.id("subscription", { label: "a plan", required: true });
  const body = form.text("body", { label: "your message", max: 2000, required: true, multiline: true });
  if (!form.ok) return failure(CHECK, form.errors);
  const result = await messageClient(ctx.db, id, body);
  if (!result.ok) return failure(dbMessage(result.error));
  refresh();
  return success("Sent.");
}
