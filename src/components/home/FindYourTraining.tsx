import Link from "next/link";
import { membershipPlans } from "@/content/memberships";
import { getService } from "@/content/services";
import { formatPenceShort, planFigures } from "@/lib/membership";
import { publishable } from "@/lib/publish";
import { formatGbp } from "@/lib/schedule";
import { ButtonLink } from "@/components/ui/ButtonLink";
import { Section, SectionHeading } from "@/components/ui/Section";

function leadPrice(id: "one-to-one" | "online-coaching") {
  const price = publishable(getService(id).prices)[0];
  return price ? `${price.prefix ? `${price.prefix} ` : ""}${formatGbp(price.amountGbp)} ${price.unit}` : null;
}

/**
 * The three ways to train. Group classes and memberships lead (they are what
 * Alex most wants people to find), with 1:1 and online beside them as two
 * short rows. Only confirmed prices and times are shown.
 */
export function FindYourTraining() {
  const classes = getService("group-classes");
  const price = publishable(classes.prices)[0];
  const lowest = Math.min(...membershipPlans.map((p) => planFigures(p, price?.amountGbp ?? 0).perClassPence));

  const others = [
    {
      id: "one-to-one" as const,
      title: "1:1 coaching",
      body: "Face-to-face coaching with Alex.",
      href: "/coaching",
      cta: "Explore 1:1 Coaching",
    },
    {
      id: "online-coaching" as const,
      title: "Online coaching",
      body: "Personalised programming, wherever you train.",
      href: "/online-coaching",
      cta: "Explore Online Coaching",
    },
  ];

  return (
    <Section id="find-your-training" labelledBy="training-heading">
      <SectionHeading id="training-heading" eyebrow="Ways to train" title="Find your training" />
      <div className="mt-8 grid grid-cols-1 gap-4 lg:mt-10 lg:grid-cols-12 lg:gap-6">
        <div data-reveal className="flex flex-col rounded-lg border border-grey bg-white p-6 sm:p-8 lg:col-span-7">
          <p className="eyebrow">Group classes</p>
          <h3 className="mt-3 font-display text-h2">Kettlebell classes</h3>
          <p className="mt-3 max-w-md">Coached kettlebell training, scaled to your level.</p>
          {price ? (
            <p className="mt-1">
              {formatGbp(price.amountGbp)} per class, or from {formatPenceShort(lowest)} per class with a membership.
            </p>
          ) : null}
          <div className="mt-auto pt-6">
            <ButtonLink href="/memberships" variant="secondary" className="w-full sm:w-auto">
              See memberships
            </ButtonLink>
          </div>
        </div>
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:col-span-5 lg:grid-cols-1 lg:gap-6">
          {others.map((o) => (
            <li key={o.id} data-reveal className="flex flex-col rounded-lg border border-grey p-6">
              <h3 className="font-display text-h3">{o.title}</h3>
              <p className="mt-3 flex-1">{o.body}</p>
              <p className="mt-4 text-sm font-semibold">{leadPrice(o.id)}</p>
              <Link
                href={o.href}
                className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-semibold uppercase tracking-[0.08em] underline underline-offset-[6px] hover:no-underline"
              >
                {o.cta} <span aria-hidden="true">→</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </Section>
  );
}
