import { site } from "@/content/site";
import { AddressCard } from "./AddressCard";
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
          <AddressCard large />
        </div>
      </div>
    </Section>
  );
}
