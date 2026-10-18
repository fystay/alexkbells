"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { failure, success, type ActionState } from "@/lib/coach/action-state";
import { getClient } from "@/lib/coach/clients";
import { actionContext } from "@/lib/coach/context";
import { dbMessage } from "@/lib/coach/errors";
import { addCheckIn, chargeSubscriptionPeriod, createSubscription, getSubscription, SUBSCRIPTION_STATUSES, updateSubscription, type SubscriptionInput } from "@/lib/coach/online";
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
