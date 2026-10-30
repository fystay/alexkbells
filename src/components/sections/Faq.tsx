import { faq } from "@/content/faq";
import { publishable } from "@/lib/publish";
import type { ReactNode } from "react";
import { Section, SectionHeading, type SectionTone } from "@/components/ui/Section";
import { Provisional } from "@/components/ui/Provisional";
import { revealDelay } from "@/lib/reveal";

/** Native <details> so it works without JavaScript and with keyboards. */
export function Faq({ headingId = "faq-heading", ids, tone = "white", footer }: { headingId?: string; ids?: readonly string[]; tone?: SectionTone; footer?: ReactNode }) {
  // `ids` picks questions for a page (in the order given); without it every question shows.
  const all = ids ? ids.flatMap((id) => faq.filter((f) => f.id === id)) : faq;
  const items = publishable(all);
  if (items.length === 0) return null;

  return (
    <Section tone={tone} labelledBy={headingId}>
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <SectionHeading id={headingId} eyebrow="FAQ" title="Questions." />
        </div>
        <div className="lg:col-span-8">
          <ul className="flex flex-col gap-3">
            {items.map((item, i) => (
              <li key={item.id} data-reveal style={revealDelay(i)} className="rounded-[1.25rem] bg-white px-5">
                <Provisional status={item.status}>
                  <details className="group">
                    <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-6 py-3 font-semibold [&::-webkit-details-marker]:hidden">
                      {item.question}
                      <span
                        aria-hidden="true"
                        className="relative size-4 shrink-0 before:absolute before:inset-x-0 before:top-1/2 before:h-px before:bg-current after:absolute after:inset-y-0 after:left-1/2 after:w-px after:bg-current after:transition-transform group-open:after:scale-y-0"
                      />
                    </summary>
                    <p className="max-w-2xl pb-4">{item.answer}</p>
                  </details>
                </Provisional>
              </li>
            ))}
          </ul>
          {footer ? <div className="mt-6">{footer}</div> : null}
        </div>
      </div>
    </Section>
  );
}
