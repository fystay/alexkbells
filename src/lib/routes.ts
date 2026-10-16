/** Public, indexable routes. Keep in sync with src/app when pages are added. */
export const publicRoutes = [
  "/",
  "/classes",
  "/coaching",
  "/contact",
  "/online-coaching",
  "/privacy",
] as const;

/**
 * Routes that still work (e.g. for old links) but are not linked from the
 * site, listed in the sitemap or indexed. The /book request flow is kept for
 * a future booking route; today bookings are arranged via /contact.
 */
export const unlistedRoutes = ["/book", "/book/group-class", "/book/one-to-one"] as const;
