"use server";

import { redirect } from "next/navigation";
import { setAttendance } from "@/lib/coach/bookings";
import { portalContext } from "@/lib/coach/context";
import { isUuid } from "@/lib/coach/db";

const HERE = "/coach";

/**
 * Today's check-in: marks one place here or a no-show, or puts it back to
 * booked when the same mark is pressed again. The database applies its usual
 * credit rules (a no-show forfeits the credit, as in the class page).
 */
export async function markPlace(formData: FormData): Promise<void> {
  const { db } = await portalContext();
  const id = String(formData.get("attendance") ?? "");
  const to = String(formData.get("to") ?? "");
  const now = String(formData.get("now") ?? "");
  if (!db || !isUuid(id) || !["attended", "no_show"].includes(to) || !["booked", "attended", "no_show"].includes(now)) redirect(HERE);
  const status = now === to ? "booked" : to === "attended" ? "attended" : "no_show";
  await setAttendance(db, id, status);
  redirect(HERE);
}
