import { cn } from "@/lib/cn";

/**
 * The short ink bar under a page or section title (owner's pick A,
 * 2026-10-26): 40 × 3 px, rounded ends. Decorative. Inside a `data-reveal`
 * block it draws in from the left as the title scrolls into view
 * (globals.css); otherwise, and with Reduce Motion, it is simply there.
 * Not used on the centred hero headline.
 */
export function TitleBar({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cn("title-bar mt-5 block h-[3px] w-10 rounded-full bg-ink", className)} />;
}
