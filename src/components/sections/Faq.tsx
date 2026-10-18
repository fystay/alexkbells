import { faq } from "@/content/faq";
import { publishable } from "@/lib/publish";
import { Section, SectionHeading } from "@/components/ui/Section";
import { Provisional } from "@/components/ui/Provisional";
import { revealDelay } from "@/lib/reveal";

/** Native <details> so it works without JavaScript and with keyboards. */
export function Faq({ headingId = "faq-heading" }: { headingId?: string }) {
  const items = publishable(faq);
  if (items.length === 0) return null;

  return (
    <Section labelledBy={headingId}>
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <SectionHeading id={headingId} eyebrow="FAQ" title="Questions" />
        </div>
        <div className="lg:col-span-8">
          <ul className="border-t border-ink">
            {items.map((item, i) => (
              <li key={item.id} data-reveal style={revealDelay(i)} className="border-b border-line">
                <Provisional status={item.status}>
                  <details className="group">
                    <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-6 py-4 text-lg font-semibold [&::-webkit-details-marker]:hidden">
                      {item.question}
                      <span
                        aria-hidden="true"
                        className="relative size-4 shrink-0 before:absolute before:inset-x-0 before:top-1/2 before:h-px before:bg-current after:absolute after:inset-y-0 after:left-1/2 after:w-px after:bg-current after:transition-transform group-open:after:scale-y-0"
                      />
                    </summary>
                    <p className="max-w-2xl pb-6 text-muted">{item.answer}</p>
                  </details>
                </Provisional>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Section>
  );
}
