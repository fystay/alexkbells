import { getClassBookingAction, getCoachingEnquiryAction } from "@/lib/booking";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Section } from "@/components/ui/Section";

interface CtaBandProps {
  title?: string;
  body?: string;
  headingId?: string;
}

export function CtaBand({
  title = "Pick up a bell.",
  body = "Come to a group class or get in touch about one-to-one or online coaching.",
  headingId = "cta-heading",
}: CtaBandProps) {
  const classes = getClassBookingAction();
  const coaching = getCoachingEnquiryAction();

  return (
    <Section tone="ink" labelledBy={headingId}>
      <div className="flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <h2 id={headingId} className="font-display text-display text-balance">
            {title}
          </h2>
          <p className="mt-6 text-lede text-muted-inverse">{body}</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
          <ButtonLink href={classes.href} external={classes.external} tone="dark">
            {classes.label}
          </ButtonLink>
          <ButtonLink href={coaching.href} tone="dark" variant="secondary">
            {coaching.label}
          </ButtonLink>
        </div>
      </div>
    </Section>
  );
}
