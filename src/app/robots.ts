import type { MetadataRoute } from "next";
import { isIndexable, siteUrl } from "@/lib/env";

/** Only the production site is crawlable; previews and review builds are not. */
export default function robots(): MetadataRoute.Robots {
  if (!isIndexable()) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
