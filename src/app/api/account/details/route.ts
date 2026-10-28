import { NextResponse } from "next/server";
import { select } from "@/lib/coach/db";
import { currentMember } from "@/lib/member-session";

/**
 * The signed-in customer's name, email and phone, so the booking and join
 * forms can fill them in (2026-10-28). Only for the session's own client;
 * signed out, an empty object. Never cached.
 */
export async function GET() {
  const headers = { "Cache-Control": "private, no-store" };
  const member = await currentMember();
  if (!member) return NextResponse.json({}, { headers });
  const rows = await select<{ full_name: string; email: string; phone: string }>(member.db, "akb_clients", [
    ["select", "full_name,email,phone"],
    ["id", `eq.${member.clientId}`],
  ]);
  const c = rows.ok ? rows.data[0] : undefined;
  return NextResponse.json(c ? { name: c.full_name, email: c.email, phone: c.phone } : {}, { headers });
}
