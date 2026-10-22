import type { ReactNode } from "react";
import type { ContentStatus } from "@/content/types";
import { isPublishable } from "@/lib/publish";

interface ProvisionalProps {
  status: ContentStatus;
  children: ReactNode;
  /** Rendered instead when the content cannot be published. */
  fallback?: ReactNode;
}

/**
 * Gate for content awaiting client approval.
 * - confirmed: renders children as-is.
 * - provisional on production: renders the fallback (or nothing).
 * - provisional with CONTENT_PREVIEW=true: renders children inside a
 *   dashed "Awaiting confirmation" frame so it cannot be mistaken for final.
 */
export function Provisional({ status, children, fallback = null }: ProvisionalProps) {
  if (status === "confirmed") return <>{children}</>;
  if (!isPublishable(status)) return <>{fallback}</>;

  return (
    <div
      className="relative outline-2 outline-offset-4 outline-dashed outline-grey"
      data-provisional="true"
    >
      <span className="absolute -top-3 right-2 z-10 border border-grey bg-white px-2 py-0.5 text-[0.625rem] font-bold uppercase tracking-wider text-ink">
        Preview · awaiting confirmation
      </span>
      {children}
    </div>
  );
}
