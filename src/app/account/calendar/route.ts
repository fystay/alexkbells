import { NextResponse, type NextRequest } from "next/server";
import { classEventFor } from "@/app/account/class-event";
import { icsFor } from "@/lib/calendar";
import { memberOverview, SIGN_IN_PATH } from "@/lib/member-auth";
import { currentMember } from "@/lib/member-session";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * One of the signed-in customer's booked classes as an .ics file
 * (/account/calendar?place=…, 2026-10-28). Only their own places that are
 * still booked and still to come; anything else is 404. Never cached.
 */
export async function GET(request: NextRequest) {
  const member = await currentMember();
  if (!member) return NextResponse.redirect(new URL(SIGN_IN_PATH, request.url));
  const place = request.nextUrl.searchParams.get("place") ?? "";
  const headers = { "Cache-Control": "private, no-store" };
  if (!UUID.test(place)) return new NextResponse("Not found", { status: 404, headers });
  const overview = await memberOverview(member.db, member.clientId);
  const found = overview.ok
    ? overview.data.places.find((p) => p.id === place && p.status === "booked" && new Date(p.starts_at).getTime() > Date.now())
    : undefined;
  if (!found) return new NextResponse("Not found", { status: 404, headers });
  return new NextResponse(icsFor(classEventFor(found)), {
    headers: {
      ...headers,
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="raeng-class-${found.class_date}.ics"`,
    },
  });
}
