import { getBookingAction, getOnlineCoachingAction } from "@/lib/booking";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Section } from "@/components/ui/Section";
import { KeepHyphens } from "@/components/ui/KeepHyphens";

interface CtaBandProps {
  title?: string;
  body?: string;
  headingId?: string;
}

export function CtaBand({
  title = "Pick up a bell.",
  body = "Book a group class or a one-to-one session, or get started with online coaching.",
  headingId = "cta-heading",
}: CtaBandProps) {
  const classes = getBookingAction("any");
  const coaching = getOnlineCoachingAction();

  return (
    <Section tone="ink" labelledBy={headingId}>
      <div className="flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <h2 id={headingId} className="font-display text-display text-balance">
            <KeepHyphens>{title}</KeepHyphens>
          </h2>
          <p className="mt-6 text-lede text-muted-inverse">{body}</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap lg:flex-col xl:flex-row xl:flex-nowrap">
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
