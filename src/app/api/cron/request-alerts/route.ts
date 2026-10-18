import { NextResponse } from "next/server";
import { cronAuthorized } from "@/lib/cron-auth";
import { bookingDeliveryConfig } from "@/lib/booking-request";
import { retryFailedAlerts } from "@/lib/request-alerts";
import { requestStoreConfig } from "@/lib/request-store";

/**
 * Resends Alex's email alerts that failed (vercel.json "crons"). Vercel Cron
 * calls it with "Authorization: Bearer <CRON_SECRET>"; anything else gets 401
 * and does nothing. The response holds counts only.
 */
export async function GET(request: Request) {
  if (!cronAuthorized(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }
  const store = requestStoreConfig();
  const mail = bookingDeliveryConfig();
  if (!store || !mail) {
    return NextResponse.json({ skipped: "not-configured" }, { headers: { "Cache-Control": "no-store" } });
  }
  const summary = await retryFailedAlerts(store, mail);
  if (!summary.ok) console.error("Reading failed request alerts failed");
  return NextResponse.json(summary, { status: summary.ok ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
