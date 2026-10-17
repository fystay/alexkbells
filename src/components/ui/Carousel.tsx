"use client";

import { Children, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

interface CarouselProps {
  /** Accessible name of the whole carousel, e.g. "Ways to train". */
  label: string;
  /** One name per slide, in order: used by the dots and the screen-reader announcement. */
  slideLabels: string[];
  /** Extra classes for every slide's <li> (e.g. desktop dividers). */
  itemClassName?: string;
  /** The slides. Each child is wrapped in its own <li>. */
  children: ReactNode;
}

function Chevron({ direction }: { direction: "left" | "right" }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d={direction === "left" ? "M10 2.5 4.5 8l5.5 5.5" : "M6 2.5 11.5 8 6 13.5"} />
    </svg>
  );
}

/** Where the list must scroll to for slide `index` to sit at its snap position. */
function targetFor(list: HTMLUListElement, index: number): number {
  const slide = list.children[index] as HTMLElement | undefined;
  if (!slide) return 0;
  const inset = parseFloat(getComputedStyle(list).scrollPaddingLeft) || 0;
  return slide.offsetLeft - inset;
}

const arrowButton =
  "inline-flex size-11 items-center justify-center border border-paper/70 text-paper transition-colors hover:bg-paper hover:text-ink focus-visible:outline-paper disabled:border-line-inverse disabled:text-paper/30 disabled:hover:bg-transparent disabled:hover:text-paper/30";

/**
 * Swipe carousel for the dark "Choose how you train" band.
 *
 * - Below lg: one slide mostly in view (86% of the screen) with the next
 *   peeking in. Native CSS scroll snapping does the swiping, so touch scrolling
 *   is the browser's own (smooth, momentum, vertical page scroll still works).
 *   The list is keyboard focusable, so the arrow keys scroll it.
 * - Pagination dots and previous/next arrows (44 px targets) mirror the scroll
 *   position and move it. Under reduced motion they jump instead of gliding.
 * - From lg: a plain three-column grid; the controls are hidden.
 * - The list breaks out of the page gutters to the screen edge and scrolls
 *   inside itself, so the page never scrolls sideways.
 */
export function Carousel({ label, slideLabels, itemClassName, children }: CarouselProps) {
  const listRef = useRef<HTMLUListElement>(null);
  const [active, setActive] = useState(0);
  /** False when everything fits (desktop grid): no controls, no carousel semantics. */
  const [scrollable, setScrollable] = useState(true);
  /** Spoken only after the visitor uses an arrow or dot, never while they swipe. */
  const [announcement, setAnnouncement] = useState("");
  const slides = Children.toArray(children);
  const count = slides.length;

  const update = useCallback(() => {
    const list = listRef.current;
    if (!list || list.children.length === 0) return;
    setScrollable(list.scrollWidth > list.clientWidth + 1);
    const atEnd = list.scrollLeft + list.clientWidth >= list.scrollWidth - 2;
    let nearest = 0;
    let best = Infinity;
    for (let i = 0; i < list.children.length; i++) {
      const distance = Math.abs(targetFor(list, i) - list.scrollLeft);
      if (distance < best) {
        best = distance;
        nearest = i;
      }
    }
    // The last slide can't always reach its snap position, so the end counts as it.
    setActive(atEnd ? list.children.length - 1 : nearest);
  }, []);

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };
    // Measure after the first paint (and again whenever the size changes).
    frame = requestAnimationFrame(update);
    list.addEventListener("scroll", onScroll, { passive: true });
    const resize = new ResizeObserver(update);
    resize.observe(list);
    return () => {
      cancelAnimationFrame(frame);
      list.removeEventListener("scroll", onScroll);
      resize.disconnect();
    };
  }, [update]);

  const goTo = (requested: number) => {
    const list = listRef.current;
    if (!list) return;
    const index = Math.max(0, Math.min(requested, count - 1));
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    list.scrollTo({ left: targetFor(list, index), behavior: reduceMotion ? "auto" : "smooth" });
    setAnnouncement(`${slideLabels[index] ?? ""}, ${index + 1} of ${count}`);
  };

  return (
    <div role="group" aria-roledescription={scrollable ? "carousel" : undefined} aria-label={label}>
      <ul
        ref={listRef}
        aria-label={`${label} cards`}
        tabIndex={scrollable ? 0 : undefined}
        className="relative -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto overscroll-x-contain px-4 [scrollbar-width:none] focus-visible:-outline-offset-2 sm:-mx-6 sm:scroll-px-6 sm:gap-4 sm:px-6 lg:mx-0 lg:grid lg:grid-cols-3 lg:gap-0 lg:overflow-visible lg:px-0 [&::-webkit-scrollbar]:hidden"
      >
        {slides.map((slide, i) => (
          <li
            key={i}
            className={cn(
              "flex w-[86vw] max-w-[28rem] shrink-0 snap-start sm:w-[24rem] lg:w-auto lg:max-w-none",
              itemClassName,
            )}
          >
            {slide}
          </li>
        ))}
      </ul>

      <div className={cn("mt-6 items-center justify-center gap-1 lg:hidden", scrollable ? "flex" : "hidden")}>
        <button type="button" onClick={() => goTo(active - 1)} disabled={active === 0} aria-label="Previous card" className={arrowButton}>
          <Chevron direction="left" />
        </button>
        <div className="flex items-center">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`${slideLabels[i] ?? `Card ${i + 1}`}, ${i + 1} of ${count}`}
              aria-current={i === active ? "true" : undefined}
              className="inline-flex size-11 items-center justify-center focus-visible:outline-paper"
            >
              <span
                aria-hidden="true"
                className={cn(
                  "block h-2.5 rounded-full transition-[width,background-color] duration-200",
                  i === active ? "w-6 bg-paper" : "w-2.5 bg-paper/45",
                )}
              />
            </button>
          ))}
        </div>
        <button type="button" onClick={() => goTo(active + 1)} disabled={active >= count - 1} aria-label="Next card" className={arrowButton}>
          <Chevron direction="right" />
        </button>
      </div>

      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </p>
    </div>
  );
}
