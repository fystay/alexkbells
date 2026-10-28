import { qty, type CoachingItem, type LoggedSet } from "./coaching";

/** Field names for one set of one exercise: load-<item>-<n>, reps-<item>-<n>, done-<item>-<n>. */
export const setField = (kind: "load" | "reps" | "done", itemId: string, setNo: number) => `${kind}-${itemId}-${setNo}`;

const field = (form: FormData, name: string) => {
  const v = form.get(name);
  return typeof v === "string" ? v.trim().slice(0, 20) : "";
};

/**
 * The sets a finished session form holds: only the exercises of the day the
 * server read from the database, only as many sets as each has, whatever the
 * browser sent. The database checks again that each set belongs to the day.
 */
export function sessionSets(form: FormData, items: readonly CoachingItem[]): LoggedSet[] {
  return items.flatMap((item) =>
    Array.from({ length: item.sets }, (_, i) => ({
      item_id: item.id,
      set_no: i + 1,
      load: field(form, setField("load", item.id, i + 1)),
      reps: field(form, setField("reps", item.id, i + 1)),
      done: form.get(setField("done", item.id, i + 1)) === "on",
    })),
  );
}

/** The number a set starts with in the form: what was programmed, e.g. "24 kg" → "24", "5 each" → "5". */
export const programmedNumber = (value: string): string => qty(value)[0];
