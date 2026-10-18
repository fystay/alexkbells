import { NextResponse } from "next/server";
import { coachDb } from "@/lib/coach/db";
import { cronAuthorized } from "@/lib/cron-auth";
import { squareConfig } from "@/lib/square/config";
import { reconcileOpenLinks } from "@/lib/square/sync";

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
  return NextResponse.json(summary, { status: summary.ok ? 200 : 503, headers: noStore });
}
