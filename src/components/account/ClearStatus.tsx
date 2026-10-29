"use client";

import { useEffect } from "react";

/**
 * After an action the account page shows what happened from ?done= / ?error=.
 * Once shown, the address goes back to /account, so a refresh or Back doesn't
 * say it again. The message stays on screen until the next page load.
 */
export function ClearStatus() {
  useEffect(() => {
    const url = new URL(window.location.href);
    if (!["done", "error", "at"].some((k) => url.searchParams.has(k))) return;
    for (const k of ["done", "error", "at"]) url.searchParams.delete(k);
    window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
  }, []);
  return null;
}
