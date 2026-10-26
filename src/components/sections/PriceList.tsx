import Link from "next/link";
import type { Price } from "@/content/types";
import { Provisional } from "@/components/ui/Provisional";
import { publishable } from "@/lib/publish";
import { formatGbp } from "@/lib/schedule";

interface PriceListProps {
  prices: Price[];
  /** Link "Send a message" to /contact. Off where a contact button sits right below. */
  linkContact?: boolean;
}

/**
 * Shows only publishable prices. When none can be published (e.g. all are
 * provisional on production) it shows a neutral "send a message" line instead.
 */
export function PriceList({ prices, linkContact = true }: PriceListProps) {
  const visible = publishable(prices);

  if (visible.length === 0) {
    return (
      <p className="text-sm ">
        {linkContact ? (
          <Link href="/contact" className="font-semibold  underline underline-offset-4">
            Send a message
          </Link>
        ) : (
          <span className="font-semibold ">Send a message</span>
        )}{" "}
        for current pricing.
      </p>
    );
  }

  const status = visible.every((p) => p.status === "confirmed") ? "confirmed" : "provisional";

  return (
    <Provisional status={status}>
      <dl data-reveal className="rule-list">
        {visible.map((price) => (
          <div key={price.label} className="rule-row flex items-baseline justify-between gap-4">
            <dt className="text-sm ">{price.label}</dt>
            <dd className="text-right">
              {price.prefix ? <span className="mr-1.5 text-sm">{price.prefix}</span> : null}
              <span className="text-2xl font-semibold tabular-nums">{formatGbp(price.amountGbp)}</span>
              <span className="ml-1.5 text-sm ">{price.unit}</span>
            </dd>
          </div>
        ))}
      </dl>
    </Provisional>
  );
}
