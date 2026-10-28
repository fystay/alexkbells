import type { ReactNode } from "react";

/** The heading every account-menu page opens with: the same eyebrow and title as Plan. */
export function SettingsHeading({ eyebrow, title, children }: { eyebrow: string; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <p className="members-eyebrow">{eyebrow}</p>
      <h1 className="text-[clamp(1.875rem,8.4vw,2.625rem)] leading-[1.05] font-extrabold tracking-[-0.035em] text-balance">{title}</h1>
      {children ? <p className="text-ink">{children}</p> : null}
    </div>
  );
}
