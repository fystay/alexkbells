import Link from "next/link";
import type { Price } from "@/content/types";
import { Provisional } from "@/components/ui/Provisional";
import { publishable } from "@/lib/publish";
import { formatGbp } from "@/lib/schedule";
import { cn } from "@/lib/cn";

interface PriceListProps {
  prices: Price[];
  tone?: "paper" | "ink";
}

/**
 * Shows only publishable prices. When none can be published (e.g. all are
 * provisional on production) it shows a neutral "get in touch" line instead.
 */
export function PriceList({ prices, tone = "paper" }: PriceListProps) {
  const muted = tone === "ink" ? "text-muted-inverse" : "text-muted";
  const visible = publishable(prices);

  if (visible.length === 0) {
    return (
      <p className={cn("text-sm", muted)}>
        <Link
          href="/contact"
          className={cn(
            "font-semibold underline underline-offset-4",
            tone === "ink" ? "text-paper" : "text-ink",
          )}
        >
          Get in touch
        </Link>{" "}
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
          <div key={price.label} className="flex items-baseline justify-between gap-4 py-4">
            <dt className={cn("text-sm", muted)}>{price.label}</dt>
            <dd className="text-right">
              {price.prefix ? (
                <span className={cn("mr-1.5 text-sm", muted)}>{price.prefix}</span>
              ) : null}
              <span className="text-2xl font-bold tabular-nums">{formatGbp(price.amountGbp)}</span>
              <span className={cn("ml-1.5 text-sm", muted)}>{price.unit}</span>
            </dd>
          </div>
        ))}
      </dl>
    </Provisional>
  );
}
