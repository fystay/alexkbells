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

/** Opening block for the public pages, on the continuous dark surface. The page's only <h1>. */
export function PageHeader({ eyebrow, title, intro, children, image }: PageHeaderProps) {
  return (
    <header>
      <div className="container-page pt-20 pb-16 sm:pt-28 sm:pb-24 lg:grid lg:grid-cols-12 lg:items-center lg:gap-x-12 lg:py-32">
        <div className={image ? "lg:col-span-7" : "lg:col-span-12"}>
          <p className="eyebrow text-muted-inverse">{eyebrow}</p>
          <h1 className="mt-5 max-w-4xl font-display text-h1 text-balance">{title}</h1>
          {intro ? <div className="mt-7 max-w-2xl text-lede text-muted-inverse">{intro}</div> : null}
          {children ? <div className="mt-10 flex flex-wrap gap-3">{children}</div> : null}
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
