import Image from "next/image";
import { coach } from "@/content/coach";
import { site } from "@/content/site";
import { journey } from "@/content/journey";
import type { Photo } from "@/content/types";
import { isPublishable } from "@/lib/publish";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Provisional } from "@/components/ui/Provisional";
import { Section } from "@/components/ui/Section";

/** The optional coach fields that are confirmed, in reading order. Empty slots are skipped. */
export function coachDetails() {
  const fields = [
    { label: "Background", field: coach.background },
    { label: "Qualifications", field: coach.qualifications },
    { label: "Philosophy", field: coach.philosophy },
    { label: "Why Alex coaches", field: coach.motivation },
  ];
  return fields.flatMap(({ label, field }) =>
    field && isPublishable(field.status) ? [{ label, paragraphs: field.text.split(/\n\s*\n/) }] : [],
  );
}

function Frame({ photo, label }: { photo: Photo; label: string }) {
  return (
    <figure className="relative">
      <div className="relative aspect-[4/5] overflow-hidden rounded-lg bg-paper">
        <Image src={photo.src} alt={photo.alt} fill sizes="(min-width: 1024px) 28vw, 50vw" className="object-cover" />
      </div>
      <figcaption className="eyebrow absolute bottom-3 left-3 rounded bg-paper px-2 py-1 text-ink">{label}</figcaption>
    </figure>
  );
}

/**
 * The person behind the brand: his journey told beside a before-and-after
 * pair (content/journey.ts), then who he is and what he does. The pair only
 * shows when the journey content is confirmed and both photos exist.
 */
export function CoachStory({ headingAs: Heading = "h2" }: { headingAs?: "h2" | "h3" }) {
  const details = coachDetails();
  const showJourney = isPublishable(journey.status);
  const photos = showJourney && journey.before && journey.after ? { before: journey.before, after: journey.after } : null;

  return (
    <Provisional status={showJourney ? journey.status : "confirmed"}>
      <Section tone="white" id="coach" labelledBy="coach-heading">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:items-center lg:gap-16">
          <div className="lg:col-span-6">
            <p className="eyebrow mb-4 ">Meet your coach</p>
            <Heading id="coach-heading" className="font-display text-h1 text-balance">
              {coach.name}
            </Heading>
            <p className="mt-6 max-w-xl text-lede ">{coach.summary}</p>
            {showJourney ? (
              <div className="mt-8 max-w-xl border-t border-grey pt-6">
                <h3 className="font-display text-h3">{journey.title}</h3>
                <p className="mt-3 ">{journey.intro}</p>
              </div>
            ) : null}
            {details.length > 0 ? (
              <dl className="mt-8 max-w-xl space-y-6 border-t border-grey pt-6">
                {details.map((d) => (
                  <div key={d.label}>
                    <dt className="eyebrow ">{d.label}</dt>
                    {d.paragraphs.map((text) => (
                      <dd key={text} className="mt-2">
                        {text}
                      </dd>
                    ))}
                  </div>
                ))}
              </dl>
            ) : null}
            <ButtonLink href="/about" variant="secondary" className="mt-10 w-full sm:w-auto">
              About RAENG
            </ButtonLink>
            <p className="mt-6 flex flex-wrap items-center gap-x-5 text-sm ">
              <a href={site.social.instagram.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center font-semibold underline underline-offset-4 hover:no-underline ">
                Instagram {site.social.instagram.handle}
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
              <span>{site.social.instagram.followers} followers</span>
              <a href={site.social.facebook.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center font-semibold underline underline-offset-4 hover:no-underline ">
                Facebook<span className="sr-only"> ({site.social.facebook.name}, opens in a new tab)</span>
              </a>
            </p>
          </div>
          {photos ? (
            <div className="lg:col-span-6">
              <div className="grid grid-cols-2 gap-3 sm:gap-5">
                <Frame photo={photos.before} label={journey.beforeLabel} />
                <Frame photo={photos.after} label={journey.afterLabel} />
              </div>
              <p className="mt-3 text-sm ">{journey.caption}</p>
            </div>
          ) : null}
        </div>
      </Section>
    </Provisional>
  );
}
