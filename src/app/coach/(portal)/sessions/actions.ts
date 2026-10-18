"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { failure, success, type ActionState } from "@/lib/coach/action-state";
import { addPtSession, getPackage, getPtSession, PT_STATUSES, reschedulePtSession, setPtStatus, updatePtNotes } from "@/lib/coach/bookings";
import { getClient } from "@/lib/coach/clients";
import { actionContext } from "@/lib/coach/context";
import { dbMessage } from "@/lib/coach/errors";
import { addDays, addMinutesIso, londonToUtc } from "@/lib/coach/time";
import { FormReader } from "@/lib/coach/validate";

const CHECK = "Please check the highlighted fields.";

/** Date, start time and length -> UTC instants. Any date within a year back or two ahead. */
function readTimes(form: FormReader, today: string): { startsAt: string; endsAt: string } | null {
  const date = form.date("date", { label: "the date", required: true });
  const time = form.time("time", { label: "the start time", required: true });
  const minutes = form.int("minutes", { label: "the length in minutes", min: 15, max: 240, required: true });
  if (date && (date < addDays(today, -365) || date > addDays(today, 730))) form.error("date", "Enter a date within the last year or the next two years.");
  if (!form.ok || !date || !time || minutes === null) return null;
  const startsAt = londonToUtc(date, time);
  return { startsAt, endsAt: addMinutesIso(startsAt, minutes) };
}

export async function addPtSessionAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await actionContext();
  if ("error" in ctx) return ctx.error;
  const form = new FormReader(formData);
  const clientId = form.id("client", { label: "a client", required: true });
  const times = readTimes(form, ctx.today);
  const packageId = form.id("package", { label: "a package" });
  const price = packageId ? null : form.pounds("price", { label: "the price", required: true, allowZero: true });
  const notes = form.text("notes", { label: "the notes", max: 1000, multiline: true });
  if (!form.ok || !times) return failure(CHECK, form.errors);

  const client = await getClient(ctx.db, clientId);
  if (!client.ok) return failure(dbMessage(client.error));
  if (!client.data) return failure("That client no longer exists.", { client: "Choose a client." });
  if (packageId) {
    const pkg = await getPackage(ctx.db, packageId);
    if (!pkg.ok) return failure(dbMessage(pkg.error));
    if (!pkg.data || pkg.data.client_id !== clientId) return failure(CHECK, { package: "That package belongs to someone else." });
  }
  const result = await addPtSession(ctx.db, { clientId, startsAt: times.startsAt, endsAt: times.endsAt, pricePence: price, packageId: packageId || null, notes, description: "One-to-one session" });
  if (!result.ok) {
    if (result.error.constraint === "akb_pt_sessions_no_overlap") return failure(dbMessage(result.error), { time: "Overlaps another session." });
    return failure(dbMessage(result.error));
  }
  redirect(`/coach/sessions/${result.data}`);
}

export async function rescheduleAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await actionContext();
  if ("error" in ctx) return ctx.error;
  const form = new FormReader(formData);
  const id = form.id("session", { label: "a session", required: true });
  const times = readTimes(form, ctx.today);
  if (!form.ok || !times) return failure(CHECK, form.errors);
  const result = await reschedulePtSession(ctx.db, id, times.startsAt, times.endsAt);
  if (!result.ok) {
    if (result.error.constraint === "akb_pt_sessions_no_overlap") return failure(dbMessage(result.error), { time: "Overlaps another session." });
    return failure(dbMessage(result.error));
  }
  refresh();
  return success("Moved. The old time is kept in the history.");
}

export async function setPtStatusAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await actionContext();
  if ("error" in ctx) return ctx.error;
  const form = new FormReader(formData);
  const id = form.id("session", { label: "a session", required: true });
  const status = form.oneOf("status", PT_STATUSES, { label: "a status", required: true });
  const reason = form.text("reason", { label: "the reason", max: 300 });
  if (!form.ok || !status) return failure("That change isn't possible.");
  const before = await getPtSession(ctx.db, id);
  if (!before.ok) return failure(dbMessage(before.error));
  if (!before.data) return failure("That session no longer exists.");
  const result = await setPtStatus(ctx.db, id, status, reason);
  if (!result.ok) return failure(dbMessage(result.error));
  redirect(`/coach/sessions/${id}?done=${before.data.package_id && status === "cancelled" ? "cancelled-package" : status}`);
}

export async function ptNotesAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await actionContext();
  if ("error" in ctx) return ctx.error;
  const form = new FormReader(formData);
  const id = form.id("session", { label: "a session", required: true });
  const notes = form.text("notes", { label: "the notes", max: 1000, multiline: true });
  if (!form.ok) return failure(CHECK, form.errors);
  const result = await updatePtNotes(ctx.db, id, notes);
  if (!result.ok) return failure(dbMessage(result.error));
  refresh();
  return success("Notes saved.");
}
