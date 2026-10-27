import { coach } from "@/content/coach";
import { site } from "@/content/site";
import { journey } from "@/content/journey";
import { isPublishable } from "@/lib/publish";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Provisional } from "@/components/ui/Provisional";
import { Section, type SectionTone } from "@/components/ui/Section";
import type { Photo } from "@/content/types";
import { PhotoFrame } from "@/components/ui/PhotoFrame";
import { BeforeAfter } from "./BeforeAfter";

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

/**
 * The person behind the brand (owner's pick, 2026-10-23: option A with C's
 * drag photo): "1% better, every day" as the headline, the before-and-after
 * frame the visitor drags straight under it, then who he is and what he does.
 * The headline and frame only show when the journey content is confirmed and
 * both photos exist; otherwise his name leads.
 */
export function CoachStory({
  headingAs: Heading = "h2",
  showAboutLink = true,
  showPhotos = true,
  portrait = null,
  tone = "white",
}: {
  headingAs?: "h2" | "h3";
  showAboutLink?: boolean;
  /** The before-and-after frame. Off on /about: it's on the home page, and Alex asked for few pictures (2026-10-27). */
  showPhotos?: boolean;
  /** One photo of Alex in the frame's place (/about, owner 2026-10-27). */
  portrait?: Photo | null;
  tone?: SectionTone;
}) {
  const details = coachDetails();
  const showJourney = isPublishable(journey.status);
  const photos = showPhotos && showJourney && journey.before && journey.after ? { before: journey.before, after: journey.after } : null;

  const Sub = Heading === "h2" ? "h3" : "h4";
  const lead = showJourney ? journey.title : coach.name;

  return (
    <Provisional status={showJourney ? journey.status : "confirmed"}>
      <Section tone={tone} id="coach" labelledBy="coach-heading">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-x-14 lg:gap-y-0">
          <div data-reveal className="lg:col-span-6 lg:self-end">
            <p className="eyebrow mb-3">Meet your coach</p>
            <Heading id="coach-heading" className="font-display text-h2 text-balance">
              {lead}
            </Heading>
          </div>
          {photos ? (
            <figure className="lg:col-span-6 lg:row-span-2 lg:self-center">
              <BeforeAfter before={photos.before} after={photos.after} beforeLabel={journey.beforeLabel} afterLabel={journey.afterLabel} />
              <figcaption className="mt-3 text-sm">{journey.caption} Drag to compare.</figcaption>
            </figure>
          ) : portrait ? (
            <div className="lg:col-span-6 lg:row-span-2 lg:self-center">
              <PhotoFrame photo={portrait} sizes="(min-width: 1248px) 560px, (min-width: 1024px) 45vw, 100vw" className="aspect-[4/5] w-full" />
            </div>
          ) : null}
          <div className="lg:col-span-6 lg:mt-8 lg:self-start">
            {showJourney ? <Sub className="card-title text-xl">{coach.name}</Sub> : null}
            <p className="mt-2 max-w-xl text-lede">{coach.summary}</p>
            {details.length > 0 ? (
              <dl className="mt-8 max-w-xl space-y-6">
                {details.map((d) => (
                  <div key={d.label}>
                    <dt className="card-title">{d.label}</dt>
                    {d.paragraphs.map((text) => (
                      <dd key={text} className="mt-2">
                        {text}
                      </dd>
                    ))}
                  </div>
                ))}
              </dl>
            ) : null}
            {showAboutLink ? (
              <ButtonLink href="/about" variant="text" className="mt-4 font-semibold underline">
                About RAENG
              </ButtonLink>
            ) : null}
            {/* Instagram only (2026-10-27): the follower count and Facebook are in the footer and on /contact. */}
            <p className="mt-3 text-sm">
              <a href={site.social.instagram.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center font-semibold underline underline-offset-4 hover:no-underline">
                Instagram {site.social.instagram.handle}
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            </p>
          </div>
        </div>
      </Section>
    </Provisional>
  );
}
