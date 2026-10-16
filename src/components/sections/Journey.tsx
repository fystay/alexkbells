import Image from "next/image";
import { journey } from "@/content/journey";
import type { Photo } from "@/content/types";
import { isPublishable } from "@/lib/publish";
import { Provisional } from "@/components/ui/Provisional";
import { Section } from "@/components/ui/Section";

function PhotoFrame({ photo, label, slot }: { photo: Photo | null; label: string; slot: string }) {
  return (
    <div className="relative aspect-[4/5] overflow-hidden bg-ink-soft">
      {photo ? (
        <Image
          src={photo.src}
          alt={photo.alt}
          width={photo.width}
          height={photo.height}
          sizes="(min-width: 1024px) 28vw, 50vw"
          className="size-full object-cover grayscale"
        />
      ) : (
        // Empty slot: only ever rendered in previews (the section is provisional until photos exist).
        <div className="flex size-full flex-col items-center justify-center gap-2 border border-dashed border-muted-inverse p-4 text-center text-sm text-muted-inverse">
          <span className="font-semibold text-paper">{label} photo</span>
          <span className="break-all text-xs">public/journey/{slot}.jpg</span>
        </div>
      )}
      <span className="eyebrow absolute top-3 left-3 bg-paper px-2 py-1 text-ink">{label}</span>
    </div>
  );
}

/**
 * Alex's journey: his story beside a before/after pair, with optional chapters.
 * Content lives in content/journey.ts; hidden on production until confirmed.
 */
export function Journey() {
  if (!isPublishable(journey.status)) return null;
  const hasPhotos = Boolean(journey.before && journey.after);
  // Confirmed content only shows the photos once both exist; previews show empty slots.
  const showPhotos = hasPhotos || journey.status === "provisional";

  return (
    <Provisional status={journey.status}>
      <Section tone="ink" labelledBy="journey-heading">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:items-center lg:gap-16">
          <div className="lg:col-span-5">
            <p className="eyebrow text-muted-inverse">Alex&apos;s journey</p>
            <h2 id="journey-heading" className="mt-4 font-display text-h2 text-balance">
              {journey.title}
            </h2>
            <p className="mt-6 max-w-xl text-lede text-muted-inverse">{journey.intro}</p>

            {journey.highlights.length > 0 ? (
              <dl className="mt-10 grid grid-cols-2 gap-x-6 gap-y-8 border-t border-line-inverse pt-8 sm:grid-cols-3">
                {journey.highlights.map((h) => (
                  // Figure shown above its label; dt stays first in the markup.
                  <div key={h.label} className="flex flex-col">
                    <dt className="order-2 mt-2 text-sm text-muted-inverse">{h.label}</dt>
                    <dd className="order-1 font-display text-h2 leading-none">{h.value}</dd>
                  </div>
                ))}
              </dl>
            ) : null}

          </div>

          {showPhotos ? (
            <figure className="lg:col-span-7">
              <div className="grid grid-cols-2 gap-2 sm:gap-4">
                <PhotoFrame photo={journey.before} label={journey.beforeLabel} slot="before" />
                <PhotoFrame photo={journey.after} label={journey.afterLabel} slot="after" />
              </div>
              {journey.caption ? (
                <figcaption className="mt-4 text-sm text-muted-inverse">{journey.caption}</figcaption>
              ) : null}
            </figure>
          ) : null}
        </div>

        {journey.chapters.length > 0 ? (
          <ol className="mt-16 grid grid-cols-1 gap-10 border-t border-line-inverse pt-10 md:grid-cols-3 md:gap-8 lg:mt-20">
            {journey.chapters.map((chapter, i) => (
              <li key={chapter.label}>
                <p className="eyebrow text-muted-inverse">
                  <span aria-hidden="true">{String(i + 1).padStart(2, "0")} · </span>
                  {chapter.label}
                </p>
                <h3 className="mt-3 font-display text-h3">{chapter.title}</h3>
                <p className="mt-3 text-muted-inverse">{chapter.body}</p>
              </li>
            ))}
          </ol>
        ) : null}
      </Section>
    </Provisional>
  );
}
