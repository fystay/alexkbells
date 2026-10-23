import { NextResponse } from "next/server";
import { fullClasses } from "@/lib/class-capacity";
import { londonToday } from "@/lib/coach/time";

/**
 * Public: which upcoming group classes are full, as "slot|date" keys, so the
 * booking calendar can show them as fully booked. No personal data, no
 * counts. Briefly cacheable at the edge.
 */
export async function GET() {
  const result = await fullClasses(londonToday());
  return NextResponse.json(
    { full: result.keys, known: result.known },
    { headers: { "Cache-Control": "public, max-age=0, s-maxage=30, stale-while-revalidate=60" } },
  );
}
