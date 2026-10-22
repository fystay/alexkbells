import type { ReactNode } from "react";
import type { Photo } from "@/content/types";
import { PhotoFrame } from "@/components/ui/PhotoFrame";

interface PageHeaderProps {
  eyebrow: string;
  title: ReactNode;
  intro?: ReactNode;
  children?: ReactNode;
  /** Desktop only (lg+), beside the text, so the page's information and call to action come first on phones. */
  image?: Photo | null;
}

/** Opening block for the inner pages. The page's only <h1>. */
export function PageHeader({ eyebrow, title, intro, children, image }: PageHeaderProps) {
  return (
    <header className="bg-paper">
      <div className="container-page pt-14 pb-12 sm:pt-20 sm:pb-16 lg:grid lg:grid-cols-12 lg:items-center lg:gap-x-12 lg:py-24">
        <div className={image ? "lg:col-span-7" : "lg:col-span-12"}>
          <p className="eyebrow">{eyebrow}</p>
          <h1 className="mt-4 max-w-4xl font-display text-h1 text-balance">{title}</h1>
          {intro ? <div className="mt-6 max-w-2xl text-lede">{intro}</div> : null}
          {children ? <div className="mt-8 flex flex-wrap gap-3">{children}</div> : null}
        </div>
        {image ? (
          <div className="hidden lg:col-span-5 lg:block">
            <PhotoFrame photo={image} sizes="(min-width: 1248px) 480px, 38vw" className="aspect-[4/5] w-full" />
          </div>
        ) : null}
      </div>
    </header>
  );
}
