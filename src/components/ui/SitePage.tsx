import type { ReactNode } from "react";

/** Wraps a public page in the continuous cream surface (see .theme-cream and .site-surface in globals.css). */
export function SitePage({ children }: { children: ReactNode }) {
  return <div className="theme-cream site-surface">{children}</div>;
}
