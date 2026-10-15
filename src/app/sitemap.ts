import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/env";
import { publicRoutes } from "@/lib/routes";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  return publicRoutes.map((route) => ({
    url: `${base}${route === "/" ? "" : route}`,
    changeFrequency: "monthly",
    priority: route === "/" ? 1 : 0.8,
  }));
}
