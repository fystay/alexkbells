"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";

/**
 * The avatar (top right) and its account menu (owner's design): a disclosure
 * button and a panel of links and buttons. Escape, a click outside or
 * following a link closes it; focus goes back to the avatar on Escape.
 */
export function AccountMenu({ initial, label, children }: { initial: string; label: string; children: ReactNode }) {
  const pathname = usePathname();
  // Open on the page it was opened on: following a link closes it.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;
  const setOpen = (value: boolean | ((was: boolean) => boolean)) =>
    setOpenOn((was) => ((typeof value === "function" ? value(was === pathname) : value) ? pathname : null));
  const panel = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    panel.current?.querySelector<HTMLElement>("a, button")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpenOn(null);
        button.current?.focus();
      }
    };
    const onClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!panel.current?.contains(t) && !button.current?.contains(t)) setOpenOn(null);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("click", onClick);
    };
  }, [open]);

  return (
    <div className="relative justify-self-end">
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls="account-menu"
        onClick={() => setOpen((v) => !v)}
        className={`grid size-11 place-items-center rounded-full`}
      >
        <span
          aria-hidden="true"
          className={`grid size-9 place-items-center rounded-full bg-ink text-[0.9375rem] font-bold text-paper ${open ? "ring-[1.5px] ring-ink ring-offset-[3px] ring-offset-paper" : ""}`}
        >
          {initial}
        </span>
        <span className="sr-only">{label}</span>
      </button>
      <div
        ref={panel}
        id="account-menu"
        hidden={!open}
        onClick={(e) => {
          if ((e.target as HTMLElement).closest("a")) setOpen(false);
        }}
        className="members-menu absolute top-[calc(100%+10px)] right-0 z-30 w-[min(300px,calc(100vw-24px))] rounded-[20px] border border-line bg-white p-2"
      >
        {children}
      </div>
    </div>
  );
}
