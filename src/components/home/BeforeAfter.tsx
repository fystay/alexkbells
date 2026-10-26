"use client";

import Image from "next/image";
import { useRef, useState, type PointerEvent } from "react";
import type { Photo } from "@/content/types";

/**
 * One frame with the before photo over the after photo, split by a handle
 * the visitor drags (owner's pick, 2026-10-23: "A combined with C's drag
 * photo"). A finger or mouse drags anywhere on the photo (sideways only, so
 * the page still scrolls); a native range input, visually hidden, gives arrow
 * keys and screen readers a slider. Without JavaScript it rests at the
 * middle, showing half of each.
 */
export function BeforeAfter({ before, after, beforeLabel, afterLabel }: { before: Photo; after: Photo; beforeLabel: string; afterLabel: string }) {
  const [split, setSplit] = useState(50);
  const dragging = useRef(false);
  const follow = (e: PointerEvent<HTMLDivElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    setSplit(Math.round(Math.min(100, Math.max(0, ((e.clientX - box.left) / box.width) * 100))));
  };
  return (
    <div
      className="relative aspect-[4/5] cursor-ew-resize touch-pan-y overflow-hidden rounded-3xl bg-ink select-none has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-4 has-[:focus-visible]:outline-ink"
      onPointerDown={(e) => {
        dragging.current = true;
        e.currentTarget.setPointerCapture(e.pointerId);
        follow(e);
      }}
      onPointerMove={(e) => {
        if (dragging.current) follow(e);
      }}
      onPointerUp={() => (dragging.current = false)}
      onPointerCancel={() => (dragging.current = false)}
      onDragStart={(e) => e.preventDefault()}
    >
      <Image src={after.src} alt={after.alt} fill sizes="(min-width: 1024px) 40vw, 92vw" draggable={false} className="object-cover" />
      <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - split}% 0 0)` }}>
        <Image src={before.src} alt={before.alt} fill sizes="(min-width: 1024px) 40vw, 92vw" draggable={false} className="object-cover" />
      </div>
      <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 w-0.5 -translate-x-1/2 bg-white" style={{ left: `${split}%` }}>
        <span className="absolute top-1/2 left-1/2 flex size-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center gap-1 rounded-full border-2 border-white bg-ink">
          <span className="h-3.5 w-0.5 bg-white" />
          <span className="h-3.5 w-0.5 bg-white" />
        </span>
      </div>
      <span aria-hidden="true" className="eyebrow pointer-events-none absolute bottom-4 left-4 rounded-full bg-paper px-3 py-1 text-ink">
        {beforeLabel}
      </span>
      <span aria-hidden="true" className="eyebrow pointer-events-none absolute right-4 bottom-4 rounded-full bg-paper px-3 py-1 text-ink">
        {afterLabel}
      </span>
      <input
        type="range"
        min={0}
        max={100}
        value={split}
        onChange={(e) => setSplit(Number(e.target.value))}
        aria-label={`Compare ${beforeLabel.toLowerCase()} and ${afterLabel.toLowerCase()}`}
        aria-valuetext={`${split}% ${beforeLabel.toLowerCase()}`}
        className="sr-only"
      />
    </div>
  );
}
