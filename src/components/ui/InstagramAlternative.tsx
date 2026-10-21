import { site } from "@/content/site";
import { cn } from "@/lib/cn";

/**
 * The secondary route beside a booking button: for questions, or for anyone
 * who'd rather message Alex than send a booking request. Never the only way
 * to book while the booking form is open.
 */
export function InstagramAlternative({ className }: { className?: string }) {
  const { instagram } = site.social;
  return (
    <p className={cn("text-sm text-muted-inverse", className)}>
      Questions first, or prefer to message?{" "}
      <a
        href={instagram.url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex min-h-11 items-center font-semibold text-paper underline underline-offset-4 hover:no-underline focus-visible:outline-paper"
      >
        Message Alex on Instagram<span className="sr-only"> ({instagram.handle}, opens in a new tab)</span>
      </a>
    </p>
  );
}
