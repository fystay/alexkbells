import Link from "next/link";
import type { Price } from "@/content/types";
import { Provisional } from "@/components/ui/Provisional";
import { publishable } from "@/lib/publish";
import { formatGbp } from "@/lib/schedule";
import { cn } from "@/lib/cn";

interface PriceListProps {
  prices: Price[];
  tone?: "paper" | "ink";
  /** Link "Get in touch" to /contact. Off where a contact button sits right below. */
  linkContact?: boolean;
}

/**
 * Shows only publishable prices. When none can be published (e.g. all are
 * provisional on production) it shows a neutral "get in touch" line instead.
 */
export function PriceList({ prices, tone = "paper", linkContact = true }: PriceListProps) {
  const muted = tone === "ink" ? "text-muted-inverse" : "text-muted";
  const visible = publishable(prices);

  if (visible.length === 0) {
    return (
      <p className={cn("text-sm", muted)}>
        {linkContact ? (
          <Link
            href="/contact"
            className={cn("font-semibold underline underline-offset-4", tone === "ink" ? "text-paper" : "text-ink")}
          >
            Get in touch
          </Link>
        ) : (
          <span className={cn("font-semibold", tone === "ink" ? "text-paper" : "text-ink")}>Get in touch</span>
        )}{" "}
        for current pricing.
      </p>
    );
  }

  const status = visible.every((p) => p.status === "confirmed") ? "confirmed" : "provisional";
  const line = tone === "ink" ? "divide-line-inverse border-line-inverse" : "divide-line border-line";

  return (
    <Provisional status={status}>
      <dl className={cn("divide-y border-y", line)}>
        {visible.map((price) => (
          <div key={price.label} className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-x-4 gap-y-1 py-4">
            <dt className={cn("min-w-0 pr-2 text-sm leading-snug", muted)}>{price.label}</dt>
            <dd className="flex items-end justify-end gap-1 text-left">
              {price.prefix ? <span className={cn("pb-0.5 text-sm", muted)}>{price.prefix}</span> : null}
              <span className="text-2xl font-bold tabular-nums leading-none">{formatGbp(price.amountGbp)}</span>
              <span className={cn("pb-0.5 text-sm", muted)}>{price.unit}</span>
            </dd>
          </div>
        ))}
      </dl>
    </Provisional>
  );
}
