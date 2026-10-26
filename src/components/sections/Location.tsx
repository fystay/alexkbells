import { formatAddressLines, mapsUrl, site } from "@/content/site";
import { Section, SectionHeading, type SectionTone } from "@/components/ui/Section";

export function Location({ headingId = "location-heading", tone = "white" }: { headingId?: string; tone?: SectionTone }) {
  return (
    <Section tone={tone} labelledBy={headingId}>
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-end">
        <div className="lg:col-span-7">
          <SectionHeading
            id={headingId}
            eyebrow="Location"
            title={
              <>
                {site.location.venue},<br />
                {site.location.town}.
              </>
            }
            intro="Group classes and one-to-one sessions take place in Cumbernauld, just outside Glasgow."
          />
        </div>
        <div className="lg:col-span-5">
          {/* The same address card as "Find us" on the home page: address, then Get directions as a link. */}
          <div className="card px-5 py-5 sm:px-6">
            <address className="text-lg not-italic leading-relaxed">
              {formatAddressLines().map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </address>
            <a
              href={mapsUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold underline underline-offset-4 hover:no-underline"
            >
              Get directions<span className="sr-only"> (opens in a new tab)</span>
            </a>
          </div>
        </div>
      </div>
    </Section>
  );
}
