import type { ReactNode } from "react";

/**
 * Page and section titles end with a full stop, or a question mark
 * (warm tech, one rule site-wide, 2026-10-26). Adds the stop to a plain
 * string title that has none; anything else is returned as it is.
 */
export function statement(title: ReactNode): ReactNode {
  return typeof title === "string" && !/[.?!]$/.test(title.trim()) ? `${title.trim()}.` : title;
}
