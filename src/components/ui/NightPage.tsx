import type { ReactNode } from "react";

/** Wraps a public page in the continuous dark surface (see .night-surface in globals.css). */
export function NightPage({ children }: { children: ReactNode }) {
  return <div className="night-surface">{children}</div>;
}
