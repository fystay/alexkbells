/** Public, indexable routes. Keep in sync with src/app when pages are added. */
export const publicRoutes = [
  "/",
  "/classes",
  "/memberships",
  "/memberships/join",
  "/coaching",
  "/contact",
  "/online-coaching",
  "/online-coaching/enquire",
  "/about",
  "/privacy",
  "/book",
  "/book/group-class",
  "/book/one-to-one",
] as const;

/** Coach sign-in: linked from the footer, but never in the sitemap or indexed. */
export const coachRoutes = ["/coach/login"] as const;
