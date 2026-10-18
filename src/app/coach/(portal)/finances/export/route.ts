import { NextResponse, type NextRequest } from "next/server";
import { portalContext } from "@/lib/coach/context";
import { ledgerCsv } from "@/lib/coach/csv";
import { loadFinances } from "@/lib/coach/finances";
import { SERVICE_KEYS } from "@/lib/coach/ledger";
import { periodRange } from "@/lib/coach/revenue";
import type { ServiceKey } from "@/lib/coach/types";

/**
 * The payments ledger for a date range as CSV. Signed-in coach only: the
 * session is checked with Supabase first (redirect to the login otherwise),
 * and the file is never cached.
 */
export async function GET(request: NextRequest) {
  const { db, today } = await portalContext();
  if (!db) return new NextResponse("The database isn't configured.", { status: 503 });
  const params = request.nextUrl.searchParams;
  const range = periodRange("custom", today, params.get("from") ?? undefined, params.get("to") ?? undefined);
  const raw = params.get("service") ?? "";
  const service = (SERVICE_KEYS as readonly string[]).includes(raw) ? (raw as ServiceKey) : undefined;

  const result = await loadFinances(db, range, today, service);
  if (!result.ok) return new NextResponse("The ledger couldn't be loaded. Try again.", { status: 503, headers: { "Cache-Control": "no-store" } });
  const d = result.data;
  const csv = ledgerCsv(d.payments, d.refunds, d.allPayments, d.clients, range);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="alexkbells-payments-${range.from}-to-${range.to}${service ? `-${service}` : ""}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
