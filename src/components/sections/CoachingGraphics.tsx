import Image from "next/image";
import type { Photo } from "@/content/types";

/*
 * The coaching pages' header graphics (owner, 2026-10-27, picked from six
 * motion options): the page's photo with a slow zoom and one quiet layer of
 * movement on top, in white over the photo. Motion lives in globals.css and
 * only runs without Reduce Motion; otherwise the finished frame shows.
 * Shaped like PageHeader's photo (4:3 on phones, 4:5 from 1024 px).
 */

const frame = "relative aspect-[4/3] w-full overflow-hidden rounded-3xl bg-ink lg:aspect-[4/5]";
const sizes = "(min-width: 1248px) 480px, (min-width: 1024px) 38vw, 100vw";

/** 1:1 coaching (option A): corner brackets close in on Alex, "Just you and Alex". */
export function FocusFrame({ photo }: { photo: Photo }) {
  return (
    <div className={frame}>
      <Image
        src={photo.src}
        alt={photo.alt}
        fill
        priority
        sizes={sizes}
        className="focus-photo object-cover"
        style={{ objectPosition: photo.position }}
      />
      <div aria-hidden="true" className="absolute inset-y-[7%] left-[22%] w-[38%] lg:inset-y-[10%] lg:left-[24%] lg:w-[40%]">
        <div className="focus-corners absolute inset-0">
          <span className="absolute top-0 left-0 size-6 border-t-2 border-l-2 border-white" />
          <span className="absolute top-0 right-0 size-6 border-t-2 border-r-2 border-white" />
          <span className="absolute bottom-0 left-0 size-6 border-b-2 border-l-2 border-white" />
          <span className="absolute right-0 bottom-0 size-6 border-r-2 border-b-2 border-white" />
        </div>
      </div>
      <p aria-hidden="true" className="focus-tag eyebrow absolute bottom-5 left-5 text-white">
        Just you and Alex
      </p>
    </div>
  );
}

/** Online coaching (option F): a line drawing upwards, "Progression" (the page: "a plan that moves forward as you do"). */
export function ProgressLine({ photo }: { photo: Photo }) {
  return (
    <div className={frame}>
      <Image
        src={photo.src}
        alt={photo.alt}
        fill
        priority
        sizes={sizes}
        className="progress-photo object-cover"
        style={{ objectPosition: photo.position }}
      />
      <p aria-hidden="true" className="eyebrow absolute top-5 left-5 text-white">
        Progression
      </p>
      <svg aria-hidden="true" viewBox="0 0 400 300" preserveAspectRatio="none" className="absolute inset-x-0 top-[22%] h-[62%] w-full overflow-visible">
        <polyline
          className="progress-line"
          points="20,280 90,245 140,255 205,190 255,175 305,115 370,55"
          fill="none"
          stroke="#ffffff"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      {/* The line's end point (370,55 of 400×300 in the box above), round at any frame shape. */}
      <span aria-hidden="true" className="absolute top-[33.4%] left-[92.5%] -translate-1/2">
        <span className="progress-dot block size-3.5 rounded-full bg-white" />
      </span>
    </div>
  );
}
