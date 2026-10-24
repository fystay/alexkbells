import { supabaseConfig, type Env } from "./env";
import { addDays, type DateKey } from "./availability/dates";
import { CLASS_WINDOW_DAYS } from "./availability/timetable";

/**
 * Which upcoming group classes can't be booked: full (a capacity is set for
 * that date in the coach portal and its booked places have reached it) or
 * cancelled by the coach (view akb_class_overview). Read on the server with
 * the secret key; only "slot|date" keys leave it, never names or counts.
 * When the database isn't configured or doesn't answer, nothing is marked
 * (Alex still confirms every place), and the caller is told it's unknown.
 */

/** "mon-evening|2026-11-02" */
export function fullKey(slot: string, date: string): string {
  return `${slot}|${date}`;
}

export type FullClasses = { known: true; keys: string[]; cancelled: string[] } | { known: false; keys: []; cancelled: [] };

const UNKNOWN: FullClasses = { known: false, keys: [], cancelled: [] };

interface OverviewRow {
  slot: string;
  class_date: string;
  capacity: number | null;
  booked: number;
  cancelled_at: string | null;
}

export async function fullClasses(today: DateKey, env: Env = process.env, fetchImpl: typeof fetch = fetch): Promise<FullClasses> {
  const config = supabaseConfig(env);
  if (!config) return UNKNOWN;
  // Rows exist only for dates Alex has touched (a booking, a capacity, a cancellation), so this stays small.
  const search = new URLSearchParams();
  search.set("select", "slot,class_date,capacity,booked,cancelled_at");
  search.append("class_date", `gte.${today}`);
  search.append("class_date", `lte.${addDays(today, CLASS_WINDOW_DAYS + 1)}`);
  try {
    const response = await fetchImpl(`${config.url}/rest/v1/akb_class_overview?${search}`, {
      headers: { apikey: config.secretKey },
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    });
    if (!response.ok) {
      console.error(`Reading class capacity failed (${response.status})`);
      return UNKNOWN;
    }
    const rows = (await response.json()) as OverviewRow[];
    return {
      known: true,
      keys: rows.filter((r) => !r.cancelled_at && r.capacity !== null && r.booked >= r.capacity).map((r) => fullKey(r.slot, r.class_date)),
      cancelled: rows.filter((r) => r.cancelled_at).map((r) => fullKey(r.slot, r.class_date)),
    };
  } catch {
    console.error("Reading class capacity failed (network)");
    return UNKNOWN;
  }
}
