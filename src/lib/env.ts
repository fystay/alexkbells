/** Minimal env shape so helpers can be tested without the full ProcessEnv. */
export type Env = Readonly<Record<string, string | undefined>>;

/**
 * Canonical site origin for metadata, sitemap and structured data.
 * Set SITE_URL on Vercel production (e.g. https://www.example.co.uk).
 * Falls back to the Vercel deployment URL, then localhost.
 */
export function siteUrl(env: Env = process.env): string {
  const raw =
    env.SITE_URL ??
    (env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${env.VERCEL_PROJECT_PRODUCTION_URL}` : undefined) ??
    "http://localhost:3000";
  return raw.replace(/\/+$/, "");
}
