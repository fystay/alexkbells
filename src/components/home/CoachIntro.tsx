import { coach } from "@/content/coach";
import { images } from "@/content/images";
import { isPublishable } from "@/lib/publish";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { PhotoFrame } from "@/components/ui/PhotoFrame";
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

export function CoachIntro() {
  const details = coachDetails();
  return (
    <Section tone="ink" id="coach" labelledBy="coach-heading">
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:items-center lg:gap-16">
        <PhotoFrame
          photo={images.coach}
          sizes="(min-width: 1024px) 36vw, 100vw"
          className="aspect-[4/5] w-full max-w-md lg:col-span-5 lg:max-w-none"
        />
        <div className="lg:col-span-7">
          <p className="eyebrow mb-4 text-muted-inverse">Meet your coach</p>
          <h2 id="coach-heading" className="font-display text-h1 text-balance">
            {coach.name}
          </h2>
          <p className="mt-6 max-w-xl text-lede text-muted-inverse">{coach.summary}</p>
          {details.length > 0 ? (
            <dl className="mt-8 max-w-xl space-y-6 border-t border-line-inverse pt-6">
              {details.map((d) => (
                <div key={d.label}>
                  <dt className="eyebrow text-muted-inverse">{d.label}</dt>
                  {d.paragraphs.map((text) => (
                    <dd key={text} className="mt-2">
                      {text}
                    </dd>
                  ))}
                </div>
              ))}
            </dl>
          ) : null}
          <ButtonLink href="/about" tone="dark" variant="secondary" className="mt-10 w-full sm:w-auto">
            About RAENG
          </ButtonLink>
        </div>
      </div>
    </Section>
  );
}
