import { site } from "@/content/site";
import { cn } from "@/lib/cn";

/**
 * The secondary route beside a booking button: for questions, or for anyone
 * who'd rather message Alex than send a booking request. Never the only way
 * to book while the booking form is open.
 */
export function InstagramAlternative({ tone = "paper", className }: { tone?: "paper" | "ink"; className?: string }) {
  const { instagram } = site.social;
  return (
    <p className={cn("text-sm", tone === "ink" ? "text-muted-inverse" : "text-muted", className)}>
      Questions first, or prefer to message?{" "}
      <a
        href={instagram.url}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "inline-flex min-h-11 items-center font-semibold underline underline-offset-4 hover:no-underline",
          tone === "ink" ? "text-paper focus-visible:outline-paper" : "text-ink",
        )}
      >
        Message Alex on Instagram<span className="sr-only"> ({instagram.handle}, opens in a new tab)</span>
      </a>
    </p>
  );
}
