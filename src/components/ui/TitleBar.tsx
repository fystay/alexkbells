"use client";

import { useLayoutEffect, useRef } from "react";
import { cn } from "@/lib/cn";

/**
 * The ink bar under a page or section title (owner's pick A, 2026-10-26),
 * 3 px, rounded ends. It runs right across the title: the full width of the
 * title's longest line (owner, 2026-10-26), measured from the heading just
 * before it and kept in step as the screen resizes; until then it spans the
 * column. Decorative. Inside a `data-reveal` block it draws in from the left
 * as the title scrolls into view (globals.css); otherwise, and with Reduce
 * Motion, it is simply there. Always placed straight after its heading. Not
 * used on the hero.
 */
export function TitleBar({ className }: { className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const bar = ref.current;
    const heading = bar?.previousElementSibling;
    if (!bar || !heading) return;
    const fit = () => {
      // A range over the heading's text measures its lines, not its box: the widest line sets the width.
      const range = document.createRange();
      range.selectNodeContents(heading);
      const width = Math.max(...Array.from(range.getClientRects(), (r) => r.right), 0) - heading.getBoundingClientRect().left;
      if (width > 0) bar.style.width = `${Math.ceil(width)}px`;
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(heading);
    return () => observer.disconnect();
  }, []);

  return <span ref={ref} aria-hidden="true" className={cn("title-bar mt-5 block h-[3px] max-w-full rounded-full bg-ink", className)} />;
}
