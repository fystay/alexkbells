import Link from "next/link";
import type { Price } from "@/content/types";
import { Provisional } from "@/components/ui/Provisional";
import { publishable } from "@/lib/publish";
import { formatGbp } from "@/lib/schedule";

interface PriceListProps {
  prices: Price[];
  /** Link "Get in touch" to /contact. Off where a contact button sits right below. */
  linkContact?: boolean;
}

/**
 * Shows only publishable prices. When none can be published (e.g. all are
 * provisional on production) it shows a neutral "get in touch" line instead.
 */
export function PriceList({ prices, linkContact = true }: PriceListProps) {
  const visible = publishable(prices);

  if (visible.length === 0) {
    return (
      <p className="text-sm text-muted-inverse">
        {linkContact ? (
          <Link href="/contact" className="font-semibold text-paper underline underline-offset-4">
            Get in touch
          </Link>
        ) : (
          <span className="font-semibold text-paper">Get in touch</span>
        )}{" "}
        for current pricing.
      </p>
    );
  }

  const status = visible.every((p) => p.status === "confirmed") ? "confirmed" : "provisional";

  return (
    <Provisional status={status}>
      <dl className="divide-y divide-line-inverse border-y border-line-inverse">
        {visible.map((price) => (
          <div key={price.label} className="flex items-baseline justify-between gap-4 py-5">
            <dt className="text-sm text-muted-inverse">{price.label}</dt>
            <dd className="text-right">
              {price.prefix ? <span className="mr-1.5 text-sm text-muted-inverse">{price.prefix}</span> : null}
              <span className="text-2xl font-medium tabular-nums">{formatGbp(price.amountGbp)}</span>
              <span className="ml-1.5 text-sm text-muted-inverse">{price.unit}</span>
            </dd>
          </div>
        ))}
      </dl>
    </Provisional>
  );
}
