import { getImageProps } from "next/image";
import type { ReactNode } from "react";
import type { Photo } from "@/content/types";

interface PageHeaderProps {
  eyebrow: string;
  title: ReactNode;
  intro?: ReactNode;
  children?: ReactNode;
  /**
   * Desktop only (lg+), beside the text, where the header otherwise leaves the
   * right half empty. Hidden on phones and tablets so the page's information
   * comes first.
   */
  image?: Photo | null;
}

const SIZES = "(min-width: 1248px) 360px, 30vw";
/** 1x1 transparent GIF: below lg the <picture> picks this, so nothing is downloaded. */
const BLANK = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

/**
 * Art direction (see Next's getImageProps docs): on desktop the image is in
 * the first view and usually the largest element, so it loads eagerly at high
 * priority; on smaller screens the <source> doesn't match and only BLANK is used.
 */
function HeaderImage({ image }: { image: Photo }) {
  const {
    props: { srcSet, alt, ...rest },
  } = getImageProps({
    src: image.src,
    alt: image.alt,
    width: image.width,
    height: image.height,
    sizes: SIZES,
    loading: "eager",
    fetchPriority: "high",
  });
  return (
    <picture>
      <source media="(min-width: 64rem)" srcSet={srcSet} sizes={SIZES} />
      {/* src={BLANK} replaces the optimised fallback URL in rest. */}
      <img {...rest} alt={alt} src={BLANK} className="aspect-[4/5] w-full object-cover" />
    </picture>
  );
}

/** Opening block for inner pages. The page's only <h1>. */
export function PageHeader({ eyebrow, title, intro, children, image }: PageHeaderProps) {
  return (
    <div className="border-b border-line bg-paper">
      <div className="container-page pt-14 pb-12 sm:pt-20 sm:pb-16 lg:grid lg:grid-cols-12 lg:items-end lg:gap-x-10 lg:pt-16 lg:pb-0">
        <div className={image ? "lg:col-span-7 lg:pb-16" : "lg:col-span-12 lg:pb-16"}>
          <p className="eyebrow text-muted">{eyebrow}</p>
          <h1 className="mt-4 max-w-4xl font-display text-h1 text-balance">{title}</h1>
          {intro ? <div className="mt-6 max-w-2xl text-lede text-muted">{intro}</div> : null}
          {children ? <div className="mt-8 flex flex-wrap gap-3">{children}</div> : null}
        </div>
        {image ? (
          // Sits on the header's bottom rule, so it reads as part of the page rather than a card.
          <div className="hidden lg:col-span-4 lg:col-start-9 lg:block">
            <HeaderImage image={image} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
