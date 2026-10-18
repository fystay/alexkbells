import type { Metadata } from "next";
import type { ReactNode } from "react";
import { PortalNav } from "@/components/coach/PortalNav";

// Portal pages are per-request and signed-in only, so they may block on the
// server rather than prerender a shell (dynamic ids can't be known at build time).
export const instant = false;

// Never indexed (also Disallowed in robots.txt and absent from the sitemap).
export const metadata: Metadata = {
  title: { default: "Coach portal", template: "%s | Coach portal" },
  robots: { index: false, follow: false },
};

/**
 * The coach portal's frame: section navigation and the page. Holds no data
 * and checks nothing itself: every page and Server Action verifies the
 * session (lib/coach/context.ts), so hiding links is never the protection.
 */
export default function PortalLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <div className="border-b border-line bg-surface">
        <div className="container-page">
          <PortalNav />
        </div>
      </div>
      <div className="container-page pt-8 pb-16 sm:pt-10 sm:pb-24">{children}</div>
    </>
  );
}
