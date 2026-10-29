import { NextResponse } from "next/server";
import { fullClasses, usualClassSize } from "@/lib/class-capacity";
import { londonToday } from "@/lib/coach/time";

/**
 * Public: which upcoming group classes are full or cancelled, as "slot|date"
 * keys, so the booking calendar shows them as fully booked or leaves them
 * out, and the usual class size for the "places max" fact. No personal data, no counts. Briefly cacheable at the edge.
 */
export async function GET() {
  const [result, size] = await Promise.all([fullClasses(londonToday()), usualClassSize()]);
  return NextResponse.json(
    { full: result.keys, cancelled: result.cancelled, known: result.known, size },
    { headers: { "Cache-Control": "public, max-age=0, s-maxage=30, stale-while-revalidate=60" } },
  );
}
