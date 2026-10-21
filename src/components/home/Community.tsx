import { testimonials } from "@/content/community";
import { images } from "@/content/images";
import { site } from "@/content/site";
import { publishable } from "@/lib/publish";
import { PhotoFrame } from "@/components/ui/PhotoFrame";
import { Section, SectionHeading } from "@/components/ui/Section";

/**
 * The atmosphere of the room. Words are about the training itself; member
 * quotes appear only if some have been confirmed in content/community.ts.
 */
export function Community() {
  const quotes = publishable(testimonials);
  return (
    <Section tone="surface" id="community" labelledBy="community-heading">
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 lg:items-center lg:gap-16">
        <div className="lg:col-span-5">
          <SectionHeading
            id="community-heading"
            eyebrow="The community"
            title="Train alongside people who show up."
            intro="A RAENG session is coached and shared. Everyone works at their own level, side by side, with a coach watching technique."
          />
          <ul className="mt-10 border-t border-ink">
            {site.themes.map((theme) => (
              <li key={theme} className="border-b border-line py-3 font-display text-h3">
                {theme}
              </li>
            ))}
          </ul>
          {quotes.length > 0 ? (
            <div className="mt-10 space-y-8">
              {quotes.map((q) => (
                <figure key={q.quote} className="border-l-2 border-ink pl-5">
                  <blockquote className="text-lede">“{q.quote}”</blockquote>
                  <figcaption className="mt-3 text-sm text-muted">{q.attribution}</figcaption>
                </figure>
              ))}
            </div>
          ) : null}
        </div>
        <div className="grid grid-cols-2 items-start gap-3 sm:gap-5 lg:col-span-7">
          <PhotoFrame photo={images.communityFocus} sizes="(min-width: 1024px) 28vw, 50vw" className="aspect-[3/5]" />
          <PhotoFrame photo={images.community} sizes="(min-width: 1024px) 28vw, 50vw" className="mt-10 aspect-[3/5] sm:mt-16" />
        </div>
      </div>
    </Section>
  );
}
