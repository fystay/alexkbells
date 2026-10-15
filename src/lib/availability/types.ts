import type { TimeOfDay } from "@/content/types";
import type { BookableService } from "@/lib/booking-options";
import type { DateKey } from "./dates";

/**
 * The boundary between the booking interface and wherever availability comes
 * from. Today the only implementation is demonstration data (./demo.ts).
 * A real booking provider or backend implements the same interface; the
 * interface code does not change.
 */
export interface Slot {
  id: string;
  time: TimeOfDay;
  available: boolean;
}

/** Days with no sessions at all are omitted. */
export interface DayAvailability {
  date: DateKey;
  slots: Slot[];
}

export interface AvailabilityWindow {
  /** "demo" data must always be labelled as such and can never be booked. */
  source: "demo" | "live";
  from: DateKey;
  to: DateKey;
  days: DayAvailability[];
}

export interface AvailabilityProvider {
  source: AvailabilityWindow["source"];
  getAvailability(service: BookableService, today: DateKey): Promise<AvailabilityWindow>;
}

export type DayStatus = "available" | "full" | "none";

export function dayStatus(day: DayAvailability | undefined): DayStatus {
  if (!day || day.slots.length === 0) return "none";
  return day.slots.some((s) => s.available) ? "available" : "full";
}
