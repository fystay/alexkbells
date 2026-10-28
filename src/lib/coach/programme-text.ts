/**
 * The coach's way of writing a client's programme (2026-10-28): plain text,
 * one exercise a line, so it can be written on a phone and pasted.
 *
 *   Week 1
 *   Day A
 *   Two-hand swing | 5 | 10 | 24 kg | optional note | optional https demo link
 *
 * A week left out repeats the nearest earlier week that is written, so one
 * Week 1 fills a six-week block and only the weeks that change need writing.
 */

export interface ProgrammeItem {
  week: number;
  day: string;
  position: number;
  name: string;
  sets: number;
  reps: string;
  load: string;
  note: string;
  video_url: string | null;
}

export type ParseResult = { ok: true; items: ProgrammeItem[] } | { ok: false; error: string };

const WEEK = /^week\s+(\d{1,2})$/i;

function isHttps(url: string): boolean {
  return url.length <= 500 && /^https:\/\/\S+\.\S+$/i.test(url);
}

export function parseProgramme(text: string, weeks: number): ParseResult {
  const written = new Map<number, Omit<ProgrammeItem, "week">[]>();
  let week = 1;
  let day: string | null = null;
  const positions = new Map<string, number>();
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const at = `Line ${i + 1}`;
    if (!line) continue;
    const w = WEEK.exec(line);
    if (w) {
      week = Number(w[1]);
      if (week < 1 || week > weeks) return { ok: false, error: `${at}: "${line}" is outside the ${weeks} weeks of this programme.` };
      if (written.has(week)) return { ok: false, error: `${at}: Week ${week} is written twice.` };
      written.set(week, []);
      day = null;
      continue;
    }
    if (!line.includes("|")) {
      if (line.length > 20) return { ok: false, error: `${at}: a day name can be up to 20 characters ("Day A", "Push"…). Exercises need | between their parts.` };
      day = line;
      if (!written.has(week)) written.set(week, []);
      continue;
    }
    if (!day) return { ok: false, error: `${at}: put a day name (for example Day A) above the exercises.` };
    const [name = "", sets = "", reps = "", load = "", note = "", video = "", ...extra] = line.split("|").map((p) => p.trim());
    if (extra.length) return { ok: false, error: `${at}: too many | in this line. Use: exercise | sets | reps | load | note | demo link.` };
    if (!name || name.length > 80) return { ok: false, error: `${at}: an exercise needs a name (up to 80 characters).` };
    if (!/^\d{1,2}$/.test(sets) || Number(sets) < 1 || Number(sets) > 20) return { ok: false, error: `${at}: "${name}" needs a number of sets from 1 to 20.` };
    if (reps.length > 20 || load.length > 20) return { ok: false, error: `${at}: reps and load can be up to 20 characters.` };
    if (note.length > 200) return { ok: false, error: `${at}: a note can be up to 200 characters.` };
    if (video && !isHttps(video)) return { ok: false, error: `${at}: the demo link must start with https:// (a link to a video hosted elsewhere).` };
    const key = `${week}|${day}`;
    const position = (positions.get(key) ?? 0) + 1;
    if (position > 40) return { ok: false, error: `${at}: a day can have up to 40 exercises.` };
    positions.set(key, position);
    written.get(week)!.push({ day, position, name, sets: Number(sets), reps, load, note, video_url: video || null });
  }
  if (written.size === 0 || ![...written.values()].some((w) => w.length > 0)) return { ok: false, error: "Write at least one exercise." };
  const items: ProgrammeItem[] = [];
  let source: Omit<ProgrammeItem, "week">[] = [];
  for (let w = 1; w <= weeks; w++) {
    const own = written.get(w);
    if (own && own.length > 0) source = own;
    else if (own) return { ok: false, error: `Week ${w} has no exercises. Leave it out to repeat the week before.` };
    for (const it of source) items.push({ week: w, ...it });
  }
  if (items.length === 0) return { ok: false, error: "Week 1 needs exercises." };
  if (items.length > 500) return { ok: false, error: "That is more than 500 exercises. Shorten it, or write fewer weeks out." };
  return { ok: true, items };
}

/** The programme back as text for editing: only weeks that differ from the one before are written. */
export function formatProgramme(items: readonly ProgrammeItem[]): string {
  const byWeek = new Map<number, ProgrammeItem[]>();
  for (const it of items) byWeek.set(it.week, [...(byWeek.get(it.week) ?? []), it]);
  const plain = (list: ProgrammeItem[]) => list.map((it) => [it.day, it.position, it.name, it.sets, it.reps, it.load, it.note, it.video_url]);
  const same = (a: ProgrammeItem[], b: ProgrammeItem[]) => JSON.stringify(plain(a)) === JSON.stringify(plain(b));
  const out: string[] = [];
  let previous: ProgrammeItem[] | null = null;
  for (const w of [...byWeek.keys()].sort((a, b) => a - b)) {
    // Already in day and position order, as the database returns them.
    const list = byWeek.get(w)!;
    if (previous && same(previous, list)) continue;
    previous = list;
    out.push(`Week ${w}`);
    let day = "";
    for (const it of list) {
      if (it.day !== day) {
        day = it.day;
        out.push(day);
      }
      const tail = [it.note, it.video_url ?? ""];
      while (tail.length && !tail[tail.length - 1]) tail.pop();
      out.push([it.name, String(it.sets), it.reps, it.load, ...tail].join(" | "));
    }
    out.push("");
  }
  return out.join("\n").trim();
}
