"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { usePathname } from "next/navigation";

/**
 * The members menu (owner's design, "action-first"): the menu button and a
 * drawer from the left, a native modal <dialog> (focus kept inside, Escape
 * and the backdrop close it). It closes when a link in it is followed.
 */
export function MembersDrawer({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    ref.current?.close();
  }, [pathname]);

  return (
    <>
      <button
        ref={button}
        type="button"
        aria-haspopup="dialog"
        aria-controls="members-drawer"
        onClick={() => ref.current?.showModal()}
        className="grid size-11 place-items-center rounded-full"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="size-[22px] fill-none stroke-ink stroke-[1.8]" strokeLinecap="round">
          <path d="M4 8h16M4 16h11" />
        </svg>
        <span className="sr-only">Members menu</span>
      </button>
      <dialog
        ref={ref}
        id="members-drawer"
        aria-label="Members menu"
        className="members-drawer"
        onClick={(e) => {
          if (e.target === ref.current || (e.target as HTMLElement).closest("a")) ref.current?.close();
        }}
      >
        <div className="flex min-h-full flex-col">
          <button
            type="button"
            onClick={() => ref.current?.close()}
            className="-mt-1 mb-2 self-end text-sm font-semibold underline underline-offset-4 hover:no-underline min-h-11"
          >
            Close
          </button>
          {children}
        </div>
      </dialog>
    </>
  );
}
