import Link from "next/link";
import { images } from "@/content/images";
import { membershipPlans } from "@/content/memberships";
import { getService } from "@/content/services";
import { formatPenceShort, planFigures } from "@/lib/membership";
import { publishable } from "@/lib/publish";
import { formatGbp } from "@/lib/schedule";
import type { Photo } from "@/content/types";
import { PhotoFrame } from "@/components/ui/PhotoFrame";
import { Section, SectionHeading } from "@/components/ui/Section";
import { cn } from "@/lib/cn";

function leadPrice(id: "one-to-one" | "online-coaching") {
  const price = publishable(getService(id).prices)[0];
  return price ? `${price.prefix ? `${price.prefix} ` : ""}${formatGbp(price.amountGbp)} ${price.unit}` : null;
}

interface Card {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
  price: string | null;
  href: string;
  cta: string;
  photo?: Photo;
  /** Solid ink card (no photo available): white text on ink. */
  inverse?: boolean;
}

/**
 * The three ways to train as a row of cards: swipe sideways on phones and
 * tablets, three across on desktop. Only confirmed prices are shown.
 */
export function FindYourTraining() {
  const group = getService("group-classes");
  const price = publishable(group.prices)[0];
  const lowest = Math.min(...membershipPlans.map((p) => planFigures(p, price?.amountGbp ?? 0).perClassPence));

  const cards: Card[] = [
    {
      id: "group",
      eyebrow: "Group classes",
      title: "Kettlebell classes",
      body: "Coached kettlebell training, scaled to your level.",
      price: price ? `${formatGbp(price.amountGbp)} per class, from ${formatPenceShort(lowest)} with a membership` : null,
      href: "/memberships",
      cta: "See memberships",
      photo: images.classes,
    },
    {
      id: "one-to-one",
      eyebrow: "One to one",
      title: "1:1 coaching",
      body: "Face-to-face coaching with Alex.",
      price: leadPrice("one-to-one"),
      href: "/coaching",
      cta: "Explore 1:1 Coaching",
      photo: images.hero,
    },
    {
      id: "online",
      eyebrow: "Online",
      title: "Online coaching",
      body: "Personalised programming, wherever you train.",
      price: leadPrice("online-coaching"),
      href: "/online-coaching",
      cta: "Explore Online Coaching",
      inverse: true,
    },
  ];

  return (
    <Section id="find-your-training" labelledBy="training-heading">
      <SectionHeading id="training-heading" eyebrow="Ways to train" title="Find your training" />
      <ul
        aria-label="Ways to train"
        className="-mx-4 mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6 lg:mx-0 lg:mt-10 lg:grid lg:grid-cols-3 lg:gap-6 lg:overflow-visible lg:px-0 lg:pb-0"
      >
        {cards.map((c) => (
          <li
            key={c.id}
            data-reveal
            className={cn(
              "flex w-[78%] shrink-0 snap-start flex-col overflow-hidden rounded-lg border sm:w-[46%] lg:w-auto",
              c.inverse ? "border-ink bg-ink text-white" : "border-grey bg-white",
            )}
          >
            {c.photo ? <PhotoFrame photo={c.photo} sizes="(min-width: 1024px) 30vw, 78vw" square className="aspect-[4/3] w-full" /> : null}
            <div className="flex flex-1 flex-col p-5 sm:p-6">
              <p className="eyebrow">{c.eyebrow}</p>
              <h3 className="mt-2 font-display text-h3">{c.title}</h3>
              <p className="mt-2 flex-1">{c.body}</p>
              {c.price ? <p className="mt-3 text-sm font-semibold">{c.price}</p> : null}
              <Link
                href={c.href}
                className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-semibold uppercase tracking-[0.08em] underline underline-offset-[6px] hover:no-underline"
              >
                {c.cta} <span aria-hidden="true">→</span>
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </Section>
  );
}
