"use client";

import type { ReactNode } from "react";
import { SHEET_EVENT, type SheetPayload } from "./sheet";

/**
 * Opens the confirm sheet with this payload. A link underneath (`href`,
 * ?confirm=…), so without JavaScript the server renders the sheet open.
 */
export function SheetTrigger({ payload, href, className, children }: { payload: SheetPayload; href: string; className?: string; children: ReactNode }) {
  return (
    <a
      href={href}
      aria-haspopup="dialog"
      className={className}
      onClick={(e) => {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent(SHEET_EVENT, { detail: payload }));
      }}
    >
      {children}
    </a>
  );
}
