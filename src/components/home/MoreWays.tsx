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
 * The other two ways to train, after the memberships (option 1 of the card
 * overhaul, owner 2026-10-26): one row each between thin rules, name and
 * price on the first line, what it is and "Explore" on the second. The whole
 * row is the way into its page. Only confirmed prices are shown.
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
        <ul className="mt-6 border-t border-line lg:col-span-7 lg:mt-0">
          {ways.map((w) => (
            <li key={w.href} className="border-b border-line">
              <Link href={w.href} className="group block py-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink">
                <span className="flex items-baseline justify-between gap-4">
                  <span className="card-title">{w.title}</span>
                  {w.price ? <span className="shrink-0 text-sm font-semibold">{w.price}</span> : null}
                </span>
                <span className="mt-1 flex items-baseline justify-between gap-4 text-sm">
                  <span>{w.body}</span>
                  {/* A plain cue that the row is a link (no arrows on the site). */}
                  <span aria-hidden="true" className="shrink-0 font-semibold underline underline-offset-4 group-hover:no-underline">
                    Explore
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </Section>
  );
}
