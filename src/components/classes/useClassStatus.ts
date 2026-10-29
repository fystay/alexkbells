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
export function useClassStatus(
  classes: readonly StatusClass[],
): Map<string, ClassStatus> | null {
  const [status, setStatus] = useState<Map<string, ClassStatus> | null>(null);
  const key = classes.map((c) => `${c.id}${c.day}${c.start}`).join();
  useEffect(() => {
    let live = true;
    fetch("/api/classes/full")
      .then((r) =>
        r.ok
          ? (r.json() as Promise<{
              full?: unknown;
              cancelled?: unknown;
              known?: unknown;
            }>)
          : null,
      )
      .then((body) => {
        if (!live || !body || body.known !== true) return;
        const keys = (list: unknown) =>
          new Set(
            Array.isArray(list)
              ? list.filter((k): k is string => typeof k === "string")
              : [],
          );
        setStatus(
          classStatuses(
            classes,
            toDateKey(new Date()),
            keys(body.full),
            keys(body.cancelled),
          ),
        );
      })
      .catch(() => {});
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `key` stands for the classes' content
  }, [key]);
  return status;
}
