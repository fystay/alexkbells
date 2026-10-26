import { formatAddressLines, mapsUrl } from "@/content/site";
import { cn } from "@/lib/cn";

/**
 * The venue's address, then Get directions as a link, with no box (2026-10-26).
 * Used by the Location section.
 */
export function AddressCard({ label, large = false, className }: { label?: string; large?: boolean; className?: string }) {
  return (
    <div className={cn("rule-list pt-4", className)}>
      {label ? <p className="eyebrow mb-2">{label}</p> : null}
      <address className={cn("not-italic leading-relaxed", large && "text-lg")}>
        {formatAddressLines().map((line) => (
          <span key={line} className="block">
            {line}
          </span>
        ))}
      </address>
      <a
        href={mapsUrl()}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold underline underline-offset-4 hover:no-underline"
      >
        Get directions<span className="sr-only"> (opens in a new tab)</span>
      </a>
    </div>
  );
}
