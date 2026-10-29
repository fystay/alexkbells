import { NextResponse } from "next/server";
import { classEventFor } from "@/app/account/class-event";
import { icsFeed } from "@/lib/calendar";
import { coachDb } from "@/lib/coach/db";
import { isToken, memberOverview, sha256Hex } from "@/lib/member-auth";
import { calendarFeedClient, feedToken } from "@/lib/member-settings";
import { site } from "@/content/site";

/**
 * The private calendar link (/account/calendar/feed/<token>.ics, 2026-10-28):
 * the member's booked classes, as a subscribable calendar. The 256-bit token
 * in the link is the only credential, looked up by its hash; anything else is
 * a plain 404 that says nothing about whether a link ever existed. Classes
 * cancelled by the member or by Alex are not in it, so they leave the
 * calendar at its next refresh. Never cached.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const headers = { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex" };
  const notFound = () => new NextResponse("Not found", { status: 404, headers });
  const token = feedToken((await params).token);
  const db = coachDb();
  if (!db || !isToken(token)) return notFound();
  const client = await calendarFeedClient(db, await sha256Hex(token));
  if (!client.ok) return new NextResponse("Please try again later", { status: 503, headers });
  if (!client.data) return notFound();
  const overview = await memberOverview(db, client.data);
  if (!overview.ok) return new NextResponse("Please try again later", { status: 503, headers });
  const events = overview.data.places.filter((p) => (p.status === "booked" || p.status === "attended") && !p.class_cancelled).map(classEventFor);
  return new NextResponse(icsFeed(events, `${site.name} classes`), {
    headers: { ...headers, "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": 'inline; filename="raeng-classes.ics"' },
  });
}
