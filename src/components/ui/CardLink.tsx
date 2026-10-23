import Link from "next/link";
import { cn } from "@/lib/cn";

/**
 * Tappable cards (owner, 2026-10-23: "the card is the button", the same across
 * the site). The whole card is one link: this footer's link stretches over the
 * card, and the card inverts while pointed at or pressed, like the buttons do.
 * Put `tapCard` (white cards) or `tapCardInverse` (ink cards) on the card.
 */
const tapBase =
  "group relative cursor-pointer motion-safe:transition-colors has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-4 has-[a:focus-visible]:outline-ink";
export const tapCard = cn(tapBase, "hover:border-ink hover:bg-ink hover:text-white active:border-ink active:bg-ink active:text-white");
export const tapCardInverse = cn(tapBase, "hover:border-ink hover:bg-white hover:text-ink active:bg-white active:text-ink");
/** For an ink badge inside a tappable card: flips to white with the card. */
export const tapBadge = "group-hover:bg-white group-hover:text-ink group-active:bg-white group-active:text-ink";

interface CardLinkProps {
  href: string;
  label: string;
  /** Read by screen readers after the label, e.g. " with the Regular plan". */
  srSuffix?: string;
  /** A short line beside the label, e.g. "Pick your first class". */
  hint?: string;
  external?: boolean;
  className?: string;
}

export function CardLink({ href, label, srSuffix, hint, external = false, className }: CardLinkProps) {
  return (
    <div className={cn("mt-5 flex items-center justify-between gap-3 border-t border-current pt-3", className)}>
      <Link
        href={href}
        {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        className="inline-flex min-h-11 items-center text-sm font-semibold tracking-[0.08em] uppercase after:absolute after:inset-0 after:content-[''] focus-visible:outline-none"
      >
        {label}
        {srSuffix ? <span className="sr-only">{srSuffix}</span> : null}
        {external ? <span className="sr-only"> (opens in a new tab)</span> : null}
      </Link>
      {hint ? (
        <span aria-hidden="true" className="text-sm">
          {hint}
        </span>
      ) : null}
    </div>
  );
}
