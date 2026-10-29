import type { Metadata } from "next";
import type { ReactNode } from "react";
import { CoachShell } from "@/components/coach/CoachShell";
import { portalContext } from "@/lib/coach/context";
import { loadShell } from "@/lib/coach/overview";

// Portal pages are per-request and signed-in only, so they may block on the
// server rather than prerender a shell (dynamic ids can't be known at build time).
export const instant = false;

// Never indexed (also Disallowed in robots.txt and absent from the sitemap).
export const metadata: Metadata = {
  title: { default: "Coach portal", template: "%s | Coach portal" },
  robots: { index: false, follow: false },
};

/**
 * The coach portal's frame (owner's coach design, 2026-10-28): the members
 * area's shell for the coach (header, menu, the four tabs). It reads the
 * session to show who is signed in and what is waiting, but authorises
 * nothing on behalf of the pages: every page and Server Action verifies the
 * session itself (lib/coach/context.ts), so hiding links is never the protection.
 */
export default async function PortalLayout({ children }: { children: ReactNode }) {
  const { coach, db, today } = await portalContext();
  const shell = db ? await loadShell(db, today) : null;
  return (
    <CoachShell email={coach.email} shell={shell}>
      {children}
    </CoachShell>
  );
}
