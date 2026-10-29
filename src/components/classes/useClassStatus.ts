"use client";

import { useEffect, useState } from "react";
import { toDateKey } from "@/lib/availability/dates";
import {
  classStatuses,
  type ClassStatus,
  type StatusClass,
} from "@/lib/class-status";

/**
 * Which classes are fully booked on their next date, and where to send people
 * instead (the next class with a place). Read in the browser from
 * /api/classes/full (no personal data), so the pages themselves stay static.
 * Null until it has loaded, and if it can't be read: every class then looks
 * open, and the server still refuses a full class when someone books.
 */
interface FullBody {
  full?: unknown;
  cancelled?: unknown;
  known?: unknown;
  size?: unknown;
}

/** One request shared by every component on the page (the rail and the timetable both ask), reused for 20 s. */
let shared: { at: number; body: Promise<FullBody | null> } | null = null;
function loadFull(): Promise<FullBody | null> {
  if (shared && Date.now() - shared.at < 20_000) return shared.body;
  const body = fetch("/api/classes/full")
    .then((r) => (r.ok ? (r.json() as Promise<FullBody>) : null))
    .catch(() => null);
  shared = { at: Date.now(), body };
  return body;
}

export function useClassStatus(classes: readonly StatusClass[]): Map<string, ClassStatus> | null {
  const [status, setStatus] = useState<Map<string, ClassStatus> | null>(null);
  const key = classes.map((c) => `${c.id}${c.day}${c.start}`).join();
  useEffect(() => {
    let live = true;
    loadFull().then((body) => {
      if (!live || !body || body.known !== true) return;
      const keys = (list: unknown) => new Set(Array.isArray(list) ? list.filter((k): k is string => typeof k === "string") : []);
      setStatus(classStatuses(classes, toDateKey(new Date()), keys(body.full), keys(body.cancelled)));
    });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` stands for the classes' content
  }, [key]);
  return status;
}

/** The usual class size for the "places max" fact; null until it has loaded, and if it can't be read. */
export function useUsualClassSize(): number | null {
  const [size, setSize] = useState<number | null>(null);
  useEffect(() => {
    let live = true;
    loadFull().then((body) => {
      if (live && body && typeof body.size === "number" && Number.isInteger(body.size) && body.size > 0) setSize(body.size);
    });
    return () => {
      live = false;
    };
  }, []);
  return size;
}
