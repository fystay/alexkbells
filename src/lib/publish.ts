import { isProductionDeployment, type Env } from "./env";
import type { ContentStatus } from "@/content/types";

/**
 * CONTENT_PREVIEW=true shows provisional content with a visible marker, so
 * Alex can review it on a preview deployment. It is ignored on Vercel
 * production, so a misconfigured variable can never publish provisional
 * prices or times. Read at build/render time on the server only.
 */
export function isPreviewMode(env: Env = process.env): boolean {
  return env.CONTENT_PREVIEW === "true" && !isProductionDeployment(env);
}

export function isPublishable(
  status: ContentStatus,
  env: Env = process.env,
): boolean {
  return status === "confirmed" || isPreviewMode(env);
}

export function publishable<T extends { status: ContentStatus }>(
  items: readonly T[],
  env: Env = process.env,
): T[] {
  return items.filter((item) => isPublishable(item.status, env));
}
