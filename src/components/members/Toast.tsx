"use client";

import { useEffect, useState } from "react";

/**
 * Says what an action did (owner's design: toasts, never alert/confirm). The
 * live region is always on the page, so the message is announced; it shows
 * for a few seconds above the tab bar.
 */
export function Toast({ message }: { message: string | null }) {
  const [shown, setShown] = useState<string | null>(null);

  useEffect(() => {
    if (!message) return;
    const show = window.setTimeout(() => setShown(message), 50);
    const hide = window.setTimeout(() => setShown(null), 5000);
    return () => {
      window.clearTimeout(show);
      window.clearTimeout(hide);
    };
  }, [message]);

  return (
    <>
      <div role="status" aria-live="polite" className={`members-toast ${shown ? "is-on" : ""}`}>
        {shown}
      </div>
      {/* Without JavaScript the message is a plain line at the top instead. */}
      {message ? (
        <noscript>
          <p className="fixed inset-x-4 top-[72px] z-30 rounded-2xl bg-ink px-5 py-3 font-semibold text-paper">{message}</p>
        </noscript>
      ) : null}
    </>
  );
}
