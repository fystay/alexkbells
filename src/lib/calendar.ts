/**
 * A booked class as a calendar event (2026-10-28): an .ics file (Apple
 * Calendar, Outlook, and Google Calendar on import). Times are UTC, so
 * every calendar shows the class at its London time.
 */
export interface ClassEvent {
  /** Stable per booked place, so adding the same class twice updates one event. */
  id: string;
  title: string;
  startsAt: string;
  durationMinutes: number;
  location: string;
  description: string;
}

/** 20261102T183000Z */
function stamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/** RFC 5545 text: backslash, semicolon, comma and newlines escaped. */
function escapeText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** Lines longer than 75 octets continue on the next line after a space (RFC 5545 3.1). */
function fold(line: string): string {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) return line;
  const parts: string[] = [];
  let current = "";
  for (const char of line) {
    const limit = parts.length === 0 ? 75 : 74;
    if (new TextEncoder().encode(current + char).length > limit) {
      parts.push(current);
      current = char;
    } else {
      current += char;
    }
  }
  parts.push(current);
  return parts.join("\r\n ");
}

function endOf(event: ClassEvent): Date {
  return new Date(new Date(event.startsAt).getTime() + event.durationMinutes * 60_000);
}

function eventLines(event: ClassEvent, now: Date): string[] {
  return [
    "BEGIN:VEVENT",
    `UID:${event.id}@raeng-fitness`,
    `DTSTAMP:${stamp(now)}`,
    `DTSTART:${stamp(new Date(event.startsAt))}`,
    `DTEND:${stamp(endOf(event))}`,
    `SUMMARY:${escapeText(event.title)}`,
    `LOCATION:${escapeText(event.location)}`,
    `DESCRIPTION:${escapeText(event.description)}`,
    "END:VEVENT",
  ];
}

export function icsFor(event: ClassEvent, now: Date = new Date()): string {
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//RAENG Fitness//Classes//EN", "CALSCALE:GREGORIAN", "METHOD:PUBLISH", ...eventLines(event, now), "END:VCALENDAR"];
  return lines.map(fold).join("\r\n") + "\r\n";
}

/**
 * A subscribable calendar (2026-10-28): every event in one feed that Apple,
 * Google and Outlook calendars re-read on their own, so a class that is
 * booked or cancelled appears or goes without anyone adding it again. The
 * UIDs match icsFor's, so a class added by hand and by feed is one event.
 */
export function icsFeed(events: readonly ClassEvent[], name: string, now: Date = new Date()): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//RAENG Fitness//Classes//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(name)}`,
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
    "X-PUBLISHED-TTL:PT1H",
    ...events.flatMap((e) => eventLines(e, now)),
    "END:VCALENDAR",
  ];
  return lines.map(fold).join("\r\n") + "\r\n";
}
