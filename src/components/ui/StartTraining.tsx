"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { cn } from "@/lib/cn";
import dynamic from "next/dynamic";
import { INTRO_MS } from "./intro-timing";

/**
 * Lazy: the intro (and its video) only loads once someone heads for the
 * booking page. It starts loading on intent (touch, hover or focus), so it is
 * usually ready by the time the swipe or tap completes.
 */
const loadIntro = () => import("./TrainingIntro");
const TrainingIntro = dynamic(() => loadIntro().then((m) => m.TrainingIntro), { ssr: false });

type Tone = "light" | "dark";

interface StartTrainingProps {
  href: string;
  label: string;
  /** Read after the label by screen readers only, e.g. " with online coaching". */
  srSuffix?: string;
  external?: boolean;
  /** The surface it sits on: "dark" draws a paper bar with an ink handle. */
  tone?: Tone;
  /**
   * "swipe": drag the arrow handle across (tap, click and Enter work too).
   * "button": the compact split button (header, phone menu).
   */
  variant?: "swipe" | "button";
  className?: string;
  /** Extra classes for the arrow handle (e.g. responsive tone overrides). */
  handleClassName?: string;
  onNavigate?: () => void;
}

/** Share of the track the handle must cross for a swipe to count. */
const THRESHOLD = 0.8;

const bar: Record<Tone, string> = {
  light: "bg-ink text-paper focus-visible:outline-ink",
  dark: "bg-paper text-ink focus-visible:outline-paper",
};
const handle: Record<Tone, string> = {
  light: "bg-paper text-ink",
  dark: "bg-ink text-paper",
};
const trail: Record<Tone, string> = { light: "bg-paper", dark: "bg-ink" };

function Arrow({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className={cn("size-4 shrink-0", className)} fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M1 8h13M9 3l5 5-5 5" />
    </svg>
  );
}

const prefersReducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * "Start your training" (2026-10-18). A real link to the booking page, so it
 * works without JavaScript and for keyboard and screen-reader users (WCAG
 * 2.5.1: the swipe is never the only way). With JavaScript, going to /book
 * plays a short intro (TrainingIntro) first, unless the visitor prefers
 * reduced motion. Links elsewhere (/contact, an external booking page) behave
 * as plain links.
 */
export function StartTraining({
  href,
  label,
  srSuffix,
  external = false,
  tone = "dark",
  variant = "swipe",
  className,
  handleClassName,
  onNavigate,
}: StartTrainingProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [intro, setIntro] = useState(false);
  const [lastPath, setLastPath] = useState(pathname);
  const [offset, setOffset] = useState(0);
  /** How far the handle can travel, measured when a drag starts. */
  const [travel, setTravel] = useState(0);
  const [dragging, setDragging] = useState(false);
  const trackRef = useRef<HTMLAnchorElement>(null);
  const handleRef = useRef<HTMLSpanElement>(null);
  const drag = useRef<{ startX: number; max: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const withIntro = !external && href.startsWith("/book");

  // The intro closes once the booking page is showing.
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setIntro(false);
    setOffset(0);
  }

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  /** Start fetching the intro as soon as someone looks like they're heading for it. */
  const warm = () => {
    if (withIntro) void loadIntro();
  };

  const go = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    onNavigate?.();
    router.push(href);
  }, [href, onNavigate, router]);

  const start = useCallback(() => {
    if (!withIntro || prefersReducedMotion()) {
      go();
      return;
    }
    router.prefetch(href);
    setIntro(true);
    timer.current = setTimeout(go, INTRO_MS);
  }, [go, href, router, withIntro]);

  const onClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (suppressClick.current) {
      // A drag that didn't reach the end isn't a tap.
      e.preventDefault();
      suppressClick.current = false;
      return;
    }
    if (external || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    if (variant === "swipe" && withIntro && !prefersReducedMotion()) {
      const max = maxOffset();
      setTravel(max);
      setOffset(max);
    }
    start();
  };

  const maxOffset = () => {
    const track = trackRef.current;
    const knob = handleRef.current;
    if (!track || !knob) return 0;
    return track.clientWidth - knob.offsetWidth - 8; // p-1 on both sides
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLSpanElement>) => {
    if (variant !== "swipe" || e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const max = maxOffset();
    drag.current = { startX: e.clientX, max, moved: false };
    setTravel(max);
    setDragging(true);
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLSpanElement>) => {
    const d = drag.current;
    if (!d) return;
    const dx = Math.min(Math.max(0, e.clientX - d.startX), d.max);
    if (dx > 4) d.moved = true;
    setOffset(dx);
  };

  const onPointerUp = () => {
    const d = drag.current;
    drag.current = null;
    setDragging(false);
    if (!d || !d.moved) return; // a tap: the click handler takes over
    suppressClick.current = true;
    if (d.max > 0 && offset / d.max >= THRESHOLD) {
      setOffset(d.max);
      start();
    } else {
      setOffset(0);
    }
  };

  const progress = travel > 0 ? offset / travel : 0;

  const linkProps = external ? { target: "_blank", rel: "noopener noreferrer" } : {};

  if (variant === "button") {
    return (
      <>
        <Link
          href={href}
          {...linkProps}
          onClick={onClick}
          onPointerEnter={warm}
          onFocus={warm}
          className={cn(
            "group inline-flex min-h-11 items-center justify-between gap-3 p-1 text-sm font-semibold uppercase tracking-[0.08em] transition-colors duration-200 active:translate-y-px",
            bar[tone],
            className,
          )}
        >
          <span className="flex-1 pl-4 text-left">
            {label}
            {srSuffix ? <span className="sr-only">{srSuffix}</span> : null}
          </span>
          <span aria-hidden="true" className={cn("flex w-9 items-center justify-center self-stretch", handle[tone], handleClassName)}>
            <Arrow className="transition-transform duration-200 group-hover:translate-x-0.5" />
          </span>
          {external ? <span className="sr-only"> (opens in a new tab)</span> : null}
        </Link>
        {intro ? <TrainingIntro onSkip={go} /> : null}
      </>
    );
  }

  return (
    <>
      <Link
        ref={trackRef}
        href={href}
        {...linkProps}
        onClick={onClick}
        onPointerEnter={warm}
        onPointerDown={warm}
        onFocus={warm}
        // Otherwise pressing and dragging picks up the link itself (native drag-and-drop) and cancels the swipe.
        draggable={false}
        onDragStart={(e) => e.preventDefault()}
        className={cn(
          "group relative flex min-h-14 select-none items-center overflow-hidden p-1 text-sm font-semibold uppercase tracking-[0.08em]",
          bar[tone],
          className,
        )}
      >
        {/* The trail behind the handle as it travels. */}
        <span
          aria-hidden="true"
          className={cn("absolute inset-y-1 left-1 opacity-15", trail[tone], handleClassName)}
          style={{ width: offset + 48 }}
        />
        <span
          ref={handleRef}
          aria-hidden="true"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          className={cn(
            "relative z-10 flex w-12 cursor-grab touch-none items-center justify-center self-stretch active:cursor-grabbing",
            !dragging && "transition-transform duration-300 ease-out",
            handle[tone],
            handleClassName,
          )}
          style={{ transform: `translateX(${offset}px)` }}
        >
          <Arrow />
        </span>
        <span
          className="flex flex-1 items-center justify-center gap-3 pr-12 pl-3 transition-opacity"
          style={{ opacity: 1 - progress * 0.9 }}
        >
          <span>
            {label}
            {srSuffix ? <span className="sr-only">{srSuffix}</span> : null}
          </span>
          {/* Hint: three chevrons that ripple towards the end. */}
          <span aria-hidden="true" className="flex text-current/50 motion-safe:animate-pulse">
            ›››
          </span>
        </span>
        {external ? <span className="sr-only"> (opens in a new tab)</span> : null}
      </Link>
      {intro ? <TrainingIntro onSkip={go} /> : null}
    </>
  );
}
