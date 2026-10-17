import type { MetadataRoute } from "next";
import { isIndexable, siteUrl } from "@/lib/env";

/**
 * Only the production site is crawlable; previews and review builds are not.
 * The coach area is excluded without a bare "/coach" prefix, which would also block /coaching.
 */
export default function robots(): MetadataRoute.Robots {
  if (!isIndexable()) {
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/coach$", "/coach/"] },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
