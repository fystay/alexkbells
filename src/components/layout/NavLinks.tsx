"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { coachLoginNav, mainNav, pageNav } from "@/content/site";
import { cn } from "@/lib/cn";
import type { CallToAction } from "@/lib/booking";

/** "page" for the page you're on (a section's sub-pages count too); Home only matches exactly. */
function currentFor(pathname: string, href: string): "page" | undefined {
  if (href === "/") return pathname === "/" ? "page" : undefined;
  return pathname === href || pathname.startsWith(`${href}/`) ? "page" : undefined;
}

export function DesktopNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="hidden xl:block">
      <ul className="flex items-center gap-5 2xl:gap-8">
        {mainNav.map((item) => {
          const active = Boolean(currentFor(pathname, item.href));
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative inline-flex min-h-11 items-center whitespace-nowrap text-[0.8125rem] font-semibold uppercase tracking-[0.1em] transition-colors xl:text-sm",
                  "after:absolute after:inset-x-0 after:bottom-2 after:h-px after:origin-left after:bg-current after:transition-transform after:duration-200",
                  active
                    ? "text-paper after:scale-x-100"
                    : "text-muted-inverse after:scale-x-0 hover:text-paper hover:after:scale-x-100",
                )}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function MobileNav({ cta }: { cta: CallToAction }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [lastPath, setLastPath] = useState(pathname);
  const panelId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close the menu whenever the route changes (e.g. back/forward). Links in the
  // panel also close it on click, which covers a link to the page you're on.
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      // Return focus to the toggle so keyboard users aren't stranded.
      buttonRef.current?.focus();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="xl:hidden">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex min-h-11 items-center gap-2 px-1 text-sm font-semibold uppercase tracking-[0.1em] text-paper"
      >
        {open ? "Close" : "Menu"}
        <svg aria-hidden="true" viewBox="0 0 20 20" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.5">
          {open ? <path d="M4 4l12 12M16 4L4 16" /> : <path d="M2 6h16M2 14h16" />}
        </svg>
      </button>

      <div
        id={panelId}
        hidden={!open}
        className="absolute inset-x-0 top-full h-[calc(100dvh-4rem)] overflow-y-auto overscroll-contain border-t border-line-inverse bg-ink pb-8 sm:h-[calc(100dvh-5rem)]"
      >
        <nav aria-label="Main" className="container-page">
          <ul className="divide-y divide-line-inverse">
            {[...mainNav, ...pageNav].map((item) => {
              const active = Boolean(currentFor(pathname, item.href));
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative flex min-h-14 items-center justify-between font-display text-2xl transition-colors",
                      active ? "text-paper" : "text-muted-inverse hover:text-paper",
                    )}
                  >
                    {/* A bar in the gutter marks where you are. */}
                    {active ? <span aria-hidden="true" className="absolute inset-y-3 -left-4 w-1 bg-paper sm:-left-6" /> : null}
                    {item.label}
                    {active ? <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-paper" /> : null}
                  </Link>
                </li>
              );
            })}
          </ul>
          <Link
            href={cta.href}
            onClick={() => setOpen(false)}
            {...(cta.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            className="mt-6 flex min-h-12 items-center justify-center bg-paper px-6 text-sm font-semibold uppercase tracking-[0.08em] text-ink transition-[background-color] duration-200 hover:bg-white focus-visible:outline-paper active:translate-y-px"
          >
            {cta.label}
            {cta.external ? <span className="sr-only"> (opens in a new tab)</span> : null}
          </Link>
          <Link
            href={coachLoginNav.href}
            onClick={() => setOpen(false)}
            aria-current={currentFor(pathname, coachLoginNav.href)}
            className="mt-4 flex min-h-12 items-center justify-center border border-line-inverse px-6 text-sm font-semibold uppercase tracking-[0.08em] text-muted-inverse transition-colors hover:border-paper hover:text-paper"
          >
            {coachLoginNav.label}
          </Link>
        </nav>
      </div>
    </div>
  );
}
