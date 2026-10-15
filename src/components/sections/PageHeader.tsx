import type { ReactNode } from "react";

interface PageHeaderProps {
  eyebrow: string;
  title: ReactNode;
  intro?: ReactNode;
  children?: ReactNode;
}

/** Opening block for inner pages. The page's only <h1>. */
export function PageHeader({ eyebrow, title, intro, children }: PageHeaderProps) {
  return (
    <div className="border-b border-line bg-paper">
      <div className="container-page pt-14 pb-12 sm:pt-20 sm:pb-16 lg:pt-24">
        <p className="eyebrow text-muted">{eyebrow}</p>
        <h1 className="mt-4 max-w-4xl font-display text-h1 text-balance">{title}</h1>
        {intro ? <div className="mt-6 max-w-2xl text-lede text-muted">{intro}</div> : null}
        {children ? <div className="mt-8 flex flex-wrap gap-3">{children}</div> : null}
      </div>
    </div>
  );
}
