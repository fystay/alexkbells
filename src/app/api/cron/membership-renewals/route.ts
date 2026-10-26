import { NextResponse } from "next/server";
import { cronAuthorized } from "@/lib/cron-auth";
import { coachDb } from "@/lib/coach/db";
import { rpc } from "@/lib/coach/db";
import { renewMemberships } from "@/lib/coach/memberships";
import { londonToday } from "@/lib/coach/time";

/**
 * Renews memberships every four weeks (vercel.json "crons", daily): each
 * active membership whose next period has begun gets that period, its credits
 * and its charge. Idempotent in the database, so a retried or doubled call
 * creates nothing twice. Vercel Cron sends "Authorization: Bearer
 * <CRON_SECRET>"; anything else gets 401 and does nothing. Counts only.
 * Also tidies member sign-ins (akb_member_cleanup: links after a day, ended
 * sessions after 30 days); a failure there is logged and never stops renewals.
 */
export async function GET(request: Request) {
  const noStore = { "Cache-Control": "no-store" };
  if (!cronAuthorized(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401, headers: noStore });
  }
  const db = coachDb();
  if (!db) return NextResponse.json({ skipped: "not-configured" }, { headers: noStore });
  const result = await renewMemberships(db, londonToday());
  if (!result.ok) {
    console.error(`Membership renewals failed (${result.error.kind} ${result.error.code})`);
    return NextResponse.json({ ok: false, error: result.error.kind }, { status: 503, headers: noStore });
  }
  const tidied = await rpc<number>(db, "akb_member_cleanup", {});
  if (!tidied.ok) console.error(`Member sign-in clean-up failed (${tidied.error.kind} ${tidied.error.code})`);
  return NextResponse.json({ ok: true, periodsCreated: result.data, signInsRemoved: tidied.ok ? tidied.data : null }, { headers: noStore });
}
