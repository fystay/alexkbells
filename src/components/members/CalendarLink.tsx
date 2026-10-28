"use client";

import { useActionState, useRef, useState } from "react";
import { createCalendarLink, type CalendarLinkState } from "@/app/account/settings-actions";
import { webcalUrl } from "@/lib/member-settings";

const initial: CalendarLinkState = { status: "idle", url: "", message: "" };

/**
 * Makes the private calendar link and shows it once (only its hash is kept).
 * "Add to my calendar" opens it in Apple Calendar and others that subscribe
 * through webcal; the copy button is for Google Calendar's "From URL".
 */
export function CalendarLink({ connected }: { connected: boolean }) {
  const [state, action, pending] = useActionState(createCalendarLink, initial);
  const [copied, setCopied] = useState(false);
  const field = useRef<HTMLInputElement>(null);

  async function copy() {
    field.current?.select();
    try {
      await navigator.clipboard.writeText(state.url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 3000);
    } catch {
      // The field is selected, so Copy from the keyboard or menu still works.
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {state.status === "error" ? (
        <p role="alert" className="rounded-2xl border-2 border-ink bg-white px-5 py-4 font-semibold">
          {state.message}
        </p>
      ) : null}
      {state.status === "ready" ? (
        <div role="status" className="flex flex-col gap-3 rounded-3xl border-[1.5px] border-ink p-5.5">
          <p className="font-semibold">Your private calendar link</p>
          <label className="flex flex-col gap-1.5 text-sm">
            <span className="sr-only">Calendar link</span>
            <input ref={field} readOnly value={state.url} onFocus={(e) => e.currentTarget.select()} className="members-input text-sm" />
          </label>
          <div className="flex flex-col gap-2.5 sm:flex-row">
            <a href={webcalUrl(state.url)} className="members-btn members-btn-solid">
              Add to my calendar
            </a>
            <button type="button" onClick={copy} className="members-btn">
              {copied ? "Copied" : "Copy link"}
            </button>
          </div>
          <p className="text-sm">
            This is the only time we show it, so add it now. In Google Calendar choose Other calendars, then From URL, and paste it. Anyone with the link can see
            your class times, so don&apos;t share it.
          </p>
        </div>
      ) : null}
      <form action={action}>
        <button type="submit" disabled={pending} className={`members-btn w-full sm:w-auto ${connected || state.status === "ready" ? "" : "members-btn-solid"}`}>
          {pending ? "Making link…" : connected || state.status === "ready" ? "Make a new link" : "Make my calendar link"}
        </button>
      </form>
      {connected && state.status !== "ready" ? <p className="text-sm">A new link replaces the old one, so calendars using the old one stop updating.</p> : null}
    </div>
  );
}
