import Link from "next/link";
import { getService } from "@/content/services";
import { publishable } from "@/lib/publish";
import { formatGbp } from "@/lib/schedule";
import { Section, SectionHeading } from "@/components/ui/Section";

function leadPrice(id: "one-to-one" | "online-coaching") {
  const price = publishable(getService(id).prices)[0];
  return price ? `${price.prefix ? `${price.prefix} ` : ""}${formatGbp(price.amountGbp)} ${price.unit}` : null;
}

/**
 * The other two ways to train, after the classes (mobile-first redesign,
 * 2026-10-24): two white rounded cards (owner, 2026-10-26: instead of ruled lines),
 * each the way into its own page. Only confirmed prices are shown.
 */
export function MoreWays() {
  const ways = [
    { href: "/coaching", title: "1:1 coaching", body: "Face-to-face coaching with Alex.", price: leadPrice("one-to-one") },
    { href: "/online-coaching", title: "Online coaching", body: "Personalised programming, wherever you train.", price: leadPrice("online-coaching") },
  ];
  return (
    <Section id="more-ways" labelledBy="more-ways-heading">
      <div className="lg:grid lg:grid-cols-12 lg:gap-x-14">
        <SectionHeading id="more-ways-heading" className="lg:col-span-5" title="More ways to train." />
        <ul className="mt-8 grid grid-cols-1 gap-3 lg:col-span-7 lg:mt-0">
          {ways.map((w) => (
            <li key={w.href}>
              <Link
                href={w.href}
                className="group card block px-5 py-5 hover:bg-ink hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink motion-safe:transition-colors sm:px-5"
              >
                <span className="card-title block">{w.title}</span>
                <span className="mt-1 block">{w.body}</span>
                {w.price ? <span className="mt-1 block text-sm font-semibold">{w.price}</span> : null}
                {/* A plain cue that the card is a link (no arrows on the site). */}
                <span aria-hidden="true" className="mt-4 inline-block text-sm font-semibold underline underline-offset-4 group-hover:no-underline">
                  Explore
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </Section>
  );
}
