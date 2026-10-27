import { NextResponse } from "next/server";
import { coachDb } from "@/lib/coach/db";
import { cronAuthorized } from "@/lib/cron-auth";
import { squareConfig } from "@/lib/square/config";
import { reconcileOpenLinks } from "@/lib/square/sync";
import { publishedClasses } from "@/lib/class-sessions";
import { notifyNewMembers } from "@/lib/membership-checkout";
import { notifyClassBookings } from "@/lib/class-checkout";

/** Daily safety net for missed Square webhooks (vercel.json "crons"). Same CRON_SECRET check as request alerts. */
export async function GET(request: Request) {
  const noStore = { "Cache-Control": "no-store" };
  if (!cronAuthorized(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: noStore });
  }
  const db = coachDb();
  const square = squareConfig();
  if (!db || !square) return NextResponse.json({ skipped: "not-configured" }, { headers: noStore });
  const summary = await reconcileOpenLinks(db, square);
  // Also catches sign-ups started by a payment the webhook missed (or recorded in the portal).
  const welcomed = await notifyNewMembers(db, publishedClasses()).catch(() => 0);
  const classBookings = await notifyClassBookings(db, publishedClasses()).catch(() => 0);
  return NextResponse.json({ ...summary, welcomed, classBookings }, { status: summary.ok ? 200 : 503, headers: noStore });
}
