import type { ClassSession, TimeOfDay, Weekday } from "@/content/types";

const WEEKDAY_ORDER: Weekday[] = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

function parseTime(time: TimeOfDay): { hours: number; minutes: number } {
  const match = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(time);
  if (!match) throw new Error(`Invalid time: ${time}`);
  return { hours: Number(match[1]), minutes: Number(match[2]) };
}

/** "18:30" -> "6:30 pm", "09:00" -> "9:00 am", "12:00" -> "12:00 pm". */
export function formatTime(time: TimeOfDay): string {
  const { hours, minutes } = parseTime(time);
  const period = hours >= 12 ? "pm" : "am";
  const h12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${h12}:${String(minutes).padStart(2, "0")} ${period}`;
}

export function shortDay(day: Weekday): string {
  return day.slice(0, 3);
}

export function sortSessions(sessions: readonly ClassSession[]): ClassSession[] {
  return [...sessions].sort((a, b) => {
    const byDay = WEEKDAY_ORDER.indexOf(a.day) - WEEKDAY_ORDER.indexOf(b.day);
    if (byDay !== 0) return byDay;
    const ta = parseTime(a.start);
    const tb = parseTime(b.start);
    return ta.hours * 60 + ta.minutes - (tb.hours * 60 + tb.minutes);
  });
}

export function partOfDay(time: TimeOfDay): "Morning" | "Afternoon" | "Evening" {
  const { hours } = parseTime(time);
  if (hours < 12) return "Morning";
  if (hours < 17) return "Afternoon";
  return "Evening";
}

/** Formats prices in GBP without pence for whole amounts. */
export function formatGbp(amount: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
  }).format(amount);
}

/** "Monday at 6:30 pm, Wednesday at 6:30 pm and Saturday at 9:00 am" */
export function describeTimetable(sessions: readonly ClassSession[]): string {
  const parts = sortSessions(sessions).map((s) => `${s.day} at ${formatTime(s.start)}`);
  if (parts.length <= 1) return parts.join("");
  return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}
