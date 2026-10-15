import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/env";

/**
 * Only the production deployment is indexable. Vercel previews (and any
 * build with CONTENT_PREVIEW=true) are excluded from search engines.
 */
export default function robots(): MetadataRoute.Robots {
  const indexable =
    process.env.CONTENT_PREVIEW !== "true" &&
    (process.env.VERCEL_ENV === undefined || process.env.VERCEL_ENV === "production");

  if (!indexable) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }

  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
