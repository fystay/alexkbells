import type { ReactNode } from "react";
import type { Photo } from "@/content/types";
import { PhotoFrame } from "@/components/ui/PhotoFrame";
import { TitleBar } from "@/components/ui/TitleBar";
import { statement } from "@/lib/title";

interface PageHeaderProps {
  eyebrow: string;
  title: ReactNode;
  intro?: ReactNode;
  children?: ReactNode;
  /**
   * Beside the text from 1024px; below the text and buttons on phones, so the
   * page's information and call to action still come first (2026-10-23: every
   * inner page opens like the home page, with a picture).
   */
  image?: Photo | null;
  /** Shown in the image's place when a page has no photo (e.g. the "Train anywhere" panel). */
  panel?: ReactNode;
}

/** Opening block for the inner pages. The page's only <h1>. */
export function PageHeader({ eyebrow, title, intro, children, image, panel }: PageHeaderProps) {
  const aside = image || panel;
  return (
    <header className="bg-paper">
      <div className="container-page pt-14 pb-12 sm:pt-20 sm:pb-16 lg:grid lg:grid-cols-12 lg:items-center lg:gap-x-12 lg:py-24">
        <div className={aside ? "lg:col-span-7" : "lg:col-span-12"}>
          <p className="eyebrow">{eyebrow}</p>
          <h1 className="mt-4 max-w-4xl font-display text-h1 text-balance">{statement(title)}</h1>
          <TitleBar />
          {intro ? <div className="mt-5 max-w-2xl text-lede">{intro}</div> : null}
          {/* Phones: stacked, so a text link sits centred under the full-width button (self-center) rather than stranded at the left. */}
          {children ? <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">{children}</div> : null}
        </div>
        {aside ? (
          <div className="mt-10 lg:col-span-5 lg:mt-0">
            {image ? (
              <PhotoFrame photo={image} sizes="(min-width: 1248px) 480px, (min-width: 1024px) 38vw, 100vw" priority className="aspect-[4/3] w-full lg:aspect-[4/5]" />
            ) : (
              panel
            )}
          </div>
        ) : null}
      </div>
    </header>
  );
}
