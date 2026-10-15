"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

interface MobileBookBarProps {
  href: string;
  label: string;
  external: boolean;
  /** CSS selectors for elements that already show a booking button; the bar hides while any is on screen. */
  hideWhenVisible: string[];
}

/**
 * Phones only: a slim booking bar fixed to the bottom of the screen once the
 * hero has scrolled away, so booking is always one tap away. It hides again
 * while the hero, the closing call to action or the footer is on screen, so
 * it never covers another booking button or the footer links.
 */
export function MobileBookBar({ href, label, external, hideWhenVisible }: MobileBookBarProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const targets = hideWhenVisible.flatMap((s) => Array.from(document.querySelectorAll(s)));
    if (targets.length === 0) return;
    const visible = new Set<Element>();
    const observer = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) visible.add(e.target);
        else visible.delete(e.target);
      }
      setShow(visible.size === 0);
    });
    targets.forEach((t) => observer.observe(t));
    return () => observer.disconnect();
  }, [hideWhenVisible]);

  const linkClass =
    "flex min-h-12 w-full items-center justify-center gap-3 bg-paper px-6 text-sm font-semibold uppercase tracking-[0.08em] text-ink";

  return (
    <div
      data-testid="mobile-book-bar"
      inert={!show}
      aria-hidden={!show}
      className={cn(
        "fixed inset-x-0 bottom-0 z-30 border-t border-line-inverse bg-ink/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-sm transition-transform duration-200 md:hidden",
        show ? "translate-y-0" : "translate-y-full",
      )}
    >
      {external ? (
        <a href={href} target="_blank" rel="noopener noreferrer" className={linkClass}>
          {label}
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      ) : (
        <Link href={href} className={linkClass}>
          {label}
          <span aria-hidden="true">→</span>
        </Link>
      )}
    </div>
  );
}
