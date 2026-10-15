"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { mainNav } from "@/content/site";
import { cn } from "@/lib/cn";
import type { CallToAction } from "@/lib/booking";

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DesktopNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="hidden md:block">
      <ul className="flex items-center gap-8">
        {mainNav.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative py-2 text-sm font-semibold uppercase tracking-[0.1em] transition-colors",
                  "after:absolute after:inset-x-0 after:-bottom-0.5 after:h-px after:origin-left after:bg-current after:transition-transform after:duration-200",
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

  // Close the menu whenever the route changes.
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="md:hidden">
      <button
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
        className="absolute inset-x-0 top-full border-t border-line-inverse bg-ink pb-8"
      >
        <nav aria-label="Main" className="container-page">
          <ul className="divide-y divide-line-inverse">
            {mainNav.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex min-h-14 items-center justify-between font-display text-2xl",
                      active ? "text-paper" : "text-muted-inverse hover:text-paper",
                    )}
                  >
                    {item.label}
                    {active ? <span className="eyebrow text-muted-inverse">Current</span> : null}
                  </Link>
                </li>
              );
            })}
          </ul>
          <Link
            href={cta.href}
            {...(cta.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            className="mt-6 flex min-h-12 items-center justify-center bg-paper px-6 text-sm font-semibold uppercase tracking-[0.08em] text-ink"
          >
            {cta.label}
          </Link>
        </nav>
      </div>
    </div>
  );
}
