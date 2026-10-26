import Image from "next/image";
import { coach } from "@/content/coach";
import { journey } from "@/content/journey";
import { isPublishable } from "@/lib/publish";

/**
 * A slim "Coached by Alex" card straight under the hero (owner, 2026-10-26):
 * a face and a name before the timetable and prices, without moving "About
 * me" from the end of Alex's order (WhatsApp, 15 Oct 2026). The whole card
 * jumps to Meet your coach. The photo is his "now" photo from the
 * before-and-after; with no confirmed photo the card shows the name alone.
 */
export function CoachIntro() {
  const photo = isPublishable(journey.status) ? journey.after : undefined;
  return (
    <section id="coach-intro" aria-label="Your coach" className="bg-paper">
      <div className="container-page pt-8 sm:pt-4">
        <a
          href="#coach"
          className="card group flex min-h-11 items-center gap-4 px-4 py-4 sm:max-w-md sm:px-5"
        >
          {photo ? (
            <Image
              src={photo.src}
              alt={coach.name}
              aria-hidden="true"
              width={photo.width}
              height={photo.height}
              sizes="56px"
              className="size-14 shrink-0 rounded-full object-cover object-top"
            />
          ) : null}
          <span className="min-w-0 flex-1">
            <span className="eyebrow block">Coached by</span>
            <span className="card-title block">{coach.name}</span>
            <span className="block text-sm">{coach.role}</span>
          </span>
          <span className="shrink-0 text-sm font-semibold underline underline-offset-4 group-hover:no-underline">Meet {coach.name.split(" ")[0]}</span>
        </a>
      </div>
    </section>
  );
}
