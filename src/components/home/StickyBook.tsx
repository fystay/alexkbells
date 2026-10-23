"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

interface StickyBookProps {
  href: string;
  label: string;
  external: boolean;
  /** e.g. ["Mon & Wed 6:30 pm", "Sat 9:00 am"]. */
  times: string[];
  /** e.g. "From £7.08 a class". */
  price: string | null;
}

/**
 * Phones only (under 768 px): a slim Book now bar fixed to the bottom of the
 * screen once the hero has scrolled away, hidden again over the footer.
 * Without JavaScript it never appears (the page already has Book now buttons).
 */
export function StickyBook({ href, label, external, times, price }: StickyBookProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const hero = document.querySelector("section[aria-labelledby=hero-heading]");
    const footer = document.querySelector("footer");
    if (!hero || !footer) return;
    let pastHero = false;
    let atFooter = false;
    const update = () => setShow(pastHero && !atFooter);
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.target === hero) pastHero = !e.isIntersecting && e.boundingClientRect.top < 0;
        if (e.target === footer) atFooter = e.isIntersecting;
      }
      update();
    });
    io.observe(hero);
    io.observe(footer);
    return () => io.disconnect();
  }, []);

  return (
    <aside
      aria-label="Book a class"
      aria-hidden={!show}
      inert={!show}
      className={cn(
        "fixed inset-x-0 bottom-0 z-30 border-t border-grey bg-paper md:hidden motion-safe:transition-transform motion-safe:duration-300",
        show ? "translate-y-0" : "translate-y-full",
      )}
    >
      <div className="flex items-center justify-between gap-3 px-4 pt-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom))]">
        <p className="min-w-0 text-[0.8125rem] leading-tight">
          {times.length > 0 ? <span className="block font-semibold">{times.join(" · ")}</span> : null}
          {price ? <span className="block">{price}</span> : null}
        </p>
        <Link
          href={href}
          {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-md border border-ink bg-ink px-5 text-[0.8125rem] font-semibold tracking-[0.08em] text-white uppercase hover:bg-white hover:text-ink"
        >
          {label}
          {external ? <span className="sr-only"> (opens in a new tab)</span> : null}
        </Link>
      </div>
    </aside>
  );
}
