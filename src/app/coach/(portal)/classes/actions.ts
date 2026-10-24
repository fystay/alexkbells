"use server";

import { refresh } from "next/cache";
import { failure, success, type ActionState } from "@/lib/coach/action-state";
import { addAttendee, ATTENDANCE_STATUSES, cancelClass, ensureClassSession, getAttendance, setAttendance, updateClassSession } from "@/lib/coach/bookings";
import { classChargeDescription, classDurationMinutes, findSlot, isTimetableClass, occurrence } from "@/lib/coach/classes";
import { getClient } from "@/lib/coach/clients";
import { actionContext } from "@/lib/coach/context";
import { dbMessage } from "@/lib/coach/errors";
import { ATTENDANCE_STATUS } from "@/lib/coach/labels";
import { FormReader } from "@/lib/coach/validate";
import { payWithCredit, periodOn } from "@/lib/coach/memberships";

const CHECK = "Please check the highlighted fields.";

/** "2026-10-24|sat-morning" -> a checked timetable class, or null. */
function readClass(form: FormReader, raw: string, today: string) {
  const [date = "", slotId = ""] = raw.split("|");
  const slot = findSlot(slotId);
  if (!slot || !isTimetableClass(date, slotId, today)) {
    form.error("class", "Choose a class from the timetable.");
    return null;
  }
  return { date, slot };
}

export async function addAttendeeAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await actionContext();
  if ("error" in ctx) return ctx.error;
  const form = new FormReader(formData);
  const clientId = form.id("client", { label: "a client", required: true });
  const useCredit = form.checked("credit");
  const price = useCredit ? 0 : form.pounds("price", { label: "the price", required: true, allowZero: true });
  const chosen = readClass(form, String(formData.get("class") ?? ""), ctx.today);
  if (!form.ok || !chosen || price === null) return failure(CHECK, form.errors);
  const client = await getClient(ctx.db, clientId);
  if (!client.ok) return failure(dbMessage(client.error));
  if (!client.data) return failure("That client no longer exists.", { client: "Choose a client." });
  // A member's place: check there's a credit before adding them, so nobody is added unpaid by mistake.
  if (useCredit) {
    const period = await periodOn(ctx.db, clientId, chosen.date);
    if (!period.ok) return failure(dbMessage(period.error));
    if (!period.data) return failure(dbMessage({ kind: "rule", code: "P0001", rule: "no_membership" }), { credit: "No membership period covers this class." });
    if (period.data.credits_left < 1) return failure(dbMessage({ kind: "rule", code: "P0001", rule: "no_credits" }), { credit: "No credits left in this period." });
  }
  const occ = occurrence(chosen.date, chosen.slot);
  const result = await addAttendee(ctx.db, {
    clientId,
    slot: chosen.slot.id,
    date: chosen.date,
    startsAt: occ.startsAt,
    duration: classDurationMinutes(chosen.slot),
    pricePence: price,
    description: classChargeDescription(chosen.date, chosen.slot),
  });
  if (!result.ok) return failure(dbMessage(result.error));
  if (useCredit) {
    const paid = await payWithCredit(ctx.db, result.data);
    refresh();
    if (!paid.ok) return failure(`${client.data.full_name} was added, but the credit couldn't be used: ${dbMessage(paid.error)}`);
    return success(`${client.data.full_name} added, paid with a membership credit.`);
  }
  refresh();
  return success(`${client.data.full_name} added${price > 0 ? ", with the class charge" : ""}.`);
}

export async function setAttendanceAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await actionContext();
  if ("error" in ctx) return ctx.error;
  const form = new FormReader(formData);
  const id = form.id("attendance", { label: "a place", required: true });
  const status = form.oneOf("status", ATTENDANCE_STATUSES, { label: "a status", required: true });
  if (!form.ok || !status) return failure("That change isn't possible.");
  const before = await getAttendance(ctx.db, id);
  if (!before.ok) return failure(dbMessage(before.error));
  if (!before.data) return failure("That place no longer exists.");
  const result = await setAttendance(ctx.db, id, status);
  if (!result.ok) return failure(dbMessage(result.error));
  refresh();
  return success(`Marked ${ATTENDANCE_STATUS[status].toLowerCase()}${status === "cancelled" ? ". An unpaid charge for it was cancelled too" : ""}.`);
}

/** Cancels the whole class (coach's decision): places cancelled, credits returned, unpaid charges cancelled. */
export async function cancelClassAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await actionContext();
  if ("error" in ctx) return ctx.error;
  const form = new FormReader(formData);
  const chosen = readClass(form, String(formData.get("class") ?? ""), ctx.today);
  const reason = form.text("reason", { label: "the reason", max: 500, multiline: true });
  if (!form.ok || !chosen) return failure(CHECK, form.errors);
  const occ = occurrence(chosen.date, chosen.slot);
  const id = await ensureClassSession(ctx.db, { slot: chosen.slot.id, date: chosen.date, startsAt: occ.startsAt, duration: classDurationMinutes(chosen.slot) });
  if (!id.ok) return failure(dbMessage(id.error));
  const result = await cancelClass(ctx.db, id.data, reason);
  if (!result.ok) return failure(dbMessage(result.error));
  refresh();
  const n = result.data;
  return success(`Class cancelled. ${n === 0 ? "Nobody was booked." : `${n} ${n === 1 ? "place" : "places"} cancelled; members' credits are back and unpaid class charges are cancelled. Let each person know.`}`);
}

export async function updateClassAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const ctx = await actionContext();
  if ("error" in ctx) return ctx.error;
  const form = new FormReader(formData);
  const chosen = readClass(form, String(formData.get("class") ?? ""), ctx.today);
  const capacity = form.int("capacity", { label: "the capacity", min: 1, max: 200 });
  const notes = form.text("notes", { label: "the notes", max: 1000, multiline: true });
  if (!form.ok || !chosen) return failure(CHECK, form.errors);
  const occ = occurrence(chosen.date, chosen.slot);
  const id = await ensureClassSession(ctx.db, { slot: chosen.slot.id, date: chosen.date, startsAt: occ.startsAt, duration: classDurationMinutes(chosen.slot) });
  if (!id.ok) return failure(dbMessage(id.error));
  const result = await updateClassSession(ctx.db, id.data, { capacity, notes });
  if (!result.ok) return failure(dbMessage(result.error));
  refresh();
  return success(capacity ? `Saved. Capacity: ${capacity}.` : "Saved. No capacity set, so the class never shows as full.");
}
