import Image from "next/image";
import type { Photo } from "@/content/types";
import { cn } from "@/lib/cn";

interface PhotoFrameProps {
  photo: Photo;
  /** Image sizes hint for next/image, e.g. "(min-width: 1024px) 30vw, 100vw". */
  sizes: string;
  /** Sets the frame's shape, e.g. "aspect-[4/5]". The photo is cropped to fit, never stretched. */
  className?: string;
  priority?: boolean;
  /** Square corners for full-bleed frames. */
  square?: boolean;
}

/**
 * Every photograph goes through here: one crop rule (object-cover around the
 * focal point set in content/images.ts), one corner radius, and a dark fill
 * while the image loads. Decorative frames pass alt="" via a photo whose alt is empty.
 */
export function PhotoFrame({ photo, sizes, className, priority = false, square = false }: PhotoFrameProps) {
  // `className` may position the frame (e.g. "absolute inset-0"), so the image sits in an inner box that always fills it.
  return (
    // Below-the-fold photos come into focus and settle from a slight zoom (globals.css);
    // priority photos (the first view) appear at once.
    <div
      {...(priority ? {} : { "data-reveal": "", "data-reveal-photo": "" })}
      className={cn("overflow-hidden bg-white", !square && "rounded-3xl", className)}
    >
      <div className="relative size-full">
        <Image
          src={photo.src}
          alt={photo.alt}
          fill
          sizes={sizes}
          priority={priority}
          className="object-cover"
          style={photo.position ? { objectPosition: photo.position } : undefined}
        />
      </div>
    </div>
  );
}
