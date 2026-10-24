import { cn } from "@/lib/cn";

/**
 * Selectable cards (owner, 2026-10-23: "when you select it, it changes colour,
 * then you press another button to proceed", the same across the site).
 * Each card is a native radio (`ChoiceMark` stretches its label over the
 * card), so arrow keys and screen readers work as for any radio group. The
 * chosen card turns ink, like the booking choices; the button under the cards
 * goes on with the choice. Put `choiceCard` on each card.
 */
export const choiceCard =
  "group/choice relative cursor-pointer motion-safe:transition-colors motion-safe:duration-[600ms] motion-safe:ease-[cubic-bezier(0.16,1,0.3,1)] " +
  "hover:border-ink has-[:checked]:border-ink has-[:checked]:bg-ink has-[:checked]:text-white " +
  "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-4 has-[:focus-visible]:outline-ink";
/** For an ink badge inside a selectable card: flips to white when the card is chosen. */
export const choiceBadge =
  "group-has-[:checked]/choice:bg-white group-has-[:checked]/choice:text-ink";

/** The card's radio: a "Select" / "Selected" line whose label covers the whole card. */
export function ChoiceMark({
  name,
  value,
  label,
  compact = false,
  className,
}: {
  name: string;
  value: string;
  label: string;
  /** Narrow cards: only the circle on phones, the words from sm up. */
  compact?: boolean;
  className?: string;
}) {
  return (
    <label
      className={cn(
        "mt-5 flex min-h-11 cursor-pointer items-center gap-3 border-t border-current pt-3 text-sm font-semibold tracking-[0.08em] uppercase after:absolute after:inset-0 after:content-['']",
        className,
      )}
    >
      <input type="radio" name={name} value={value} className="sr-only" />
      <span
        aria-hidden="true"
        className="flex size-5 shrink-0 items-center justify-center rounded-full border border-current"
      >
        <span className="size-2.5 scale-0 rounded-full bg-current motion-safe:transition-transform group-has-[:checked]/choice:scale-100" />
      </span>
      <span
        aria-hidden="true"
        className={cn(
          "group-has-[:checked]/choice:hidden",
          compact && "max-sm:hidden",
        )}
      >
        Select
      </span>
      <span
        aria-hidden="true"
        className={cn(
          "hidden",
          compact
            ? "sm:group-has-[:checked]/choice:inline"
            : "group-has-[:checked]/choice:inline",
        )}
      >
        Selected
      </span>
      <span className="sr-only">{label}</span>
    </label>
  );
}
