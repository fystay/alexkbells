import Image from "next/image";
import { coach } from "@/content/coach";
import { journey } from "@/content/journey";
import { isPublishable } from "@/lib/publish";

/**
 * A slim "Coached by Alex" line straight under the hero (owner, 2026-10-26):
 * a face and a name before the timetable and prices, without moving "About
 * me" from the end of Alex's order (WhatsApp, 15 Oct 2026). No card (option 1
 * of the card overhaul). The whole line jumps to Meet your coach. The photo is
 * his "now" photo from the before-and-after; with no confirmed photo the line
 * shows the name alone.
 */
export function CoachIntro() {
  const photo = isPublishable(journey.status) ? journey.after : undefined;
  return (
    <section id="coach-intro" aria-label="Your coach" className="bg-paper">
      <div className="container-page pt-5 sm:pt-2 lg:pt-4">
        <a href="#coach" className="group flex min-h-12 items-center gap-3 sm:max-w-md">
          {photo ? (
            <Image
              src={photo.src}
              alt={coach.name}
              aria-hidden="true"
              width={photo.width}
              height={photo.height}
              sizes="48px"
              className="size-10 shrink-0 lg:size-12 rounded-full object-cover object-top"
            />
          ) : null}
          {/* Name only: his role is in Meet your coach (fewer repeats, owner 2026-10-26). */}
          <span className="min-w-0 flex-1 text-sm leading-snug lg:text-base">
            Coached by <span className="font-semibold">{coach.name}</span>
          </span>
          <span className="shrink-0 text-sm font-semibold underline underline-offset-4 group-hover:no-underline lg:text-base">Meet {coach.name.split(" ")[0]}</span>
        </a>
      </div>
    </section>
  );
}
