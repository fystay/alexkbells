import type { Metadata } from "next";
import { site } from "@/content/site";

export const DEFAULT_TITLE = `${site.name} | Kettlebell Coaching in Cumbernauld`;

/** Social preview image (generated from the logo by scripts/brand_assets.py). */
const shareImage = {
  url: "/og-image.png",
  width: 1200,
  height: 630,
  alt: `${site.name}, ${site.descriptor} logo`,
  type: "image/png",
};

/**
 * Open Graph fields shared by every page. The image is declared explicitly
 * because a page-level `openGraph` object replaces the layout's entirely.
 */
export const baseOpenGraph = {
  type: "website" as const,
  locale: "en_GB",
  siteName: site.name,
  images: [shareImage],
};

interface PageMetadataInput {
  /** Short page title; the layout template appends the brand. Omit for the homepage. */
  title?: string;
  description: string;
  /** Route path, e.g. "/classes". Resolved against metadataBase. */
  path: string;
  /** Keep the page out of search results (e.g. the coach area). */
  noindex?: boolean;
}

/**
 * Per-page metadata with a matching canonical URL and social preview,
 * so shared links show the right page title rather than the homepage's.
 */
export function pageMetadata({ title, description, path, noindex = false }: PageMetadataInput): Metadata {
  const fullTitle = title ? `${title} | ${site.name}` : DEFAULT_TITLE;
  return {
    ...(title ? { title } : {}),
    description,
    alternates: { canonical: path },
    ...(noindex ? { robots: { index: false, follow: true } } : {}),
    openGraph: { ...baseOpenGraph, title: fullTitle, description, url: path },
    twitter: { card: "summary_large_image", title: fullTitle, description, images: [shareImage.url] },
  };
}
