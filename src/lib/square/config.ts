import type { Env } from "../env";

/**
 * Square settings, server only (never NEXT_PUBLIC_). Square stays off unless
 * every value is present and the environment matches the deployment:
 * - "production" (real money) only on Vercel production;
 * - "sandbox" (test money) everywhere else, never on Vercel production.
 * So a preview or local build can't take a real payment, and production can't
 * be pointed at test credentials by mistake.
 */

export type SquareEnvironment = "sandbox" | "production";

export const SQUARE_API_VERSION = "2026-09-16";

const BASE_URLS: Record<SquareEnvironment, string> = {
  sandbox: "https://connect.squareupsandbox.com",
  production: "https://connect.squareup.com",
};

export interface SquareConfig {
  environment: SquareEnvironment;
  baseUrl: string;
  accessToken: string;
  locationId: string;
}

export interface SquareWebhookConfig {
  environment: SquareEnvironment;
  signatureKey: string;
  /** Exactly the notification URL registered in the Square Developer Console: part of what Square signs. */
  notificationUrl: string;
}

function environment(env: Env): SquareEnvironment | null {
  const raw = env.SQUARE_ENVIRONMENT?.trim();
  const isProductionDeployment = env.VERCEL_ENV === "production";
  if (raw === "production") return isProductionDeployment ? "production" : null;
  if (raw === "sandbox") return isProductionDeployment ? null : "sandbox";
  return null;
}

/** For the API in tests only: a localhost stand-in, never on Vercel. */
function baseUrl(env: Env, environmentName: SquareEnvironment): string {
  const override = env.SQUARE_API_URL?.trim();
  if (override && !env.VERCEL_ENV && /^http:\/\/localhost:\d+$/.test(override)) return override;
  return BASE_URLS[environmentName];
}

export function squareConfig(env: Env = process.env): SquareConfig | null {
  const name = environment(env);
  const accessToken = env.SQUARE_ACCESS_TOKEN?.trim();
  const locationId = env.SQUARE_LOCATION_ID?.trim();
  if (!name || !accessToken || !locationId) return null;
  return { environment: name, baseUrl: baseUrl(env, name), accessToken, locationId };
}

export function squareWebhookConfig(env: Env = process.env): SquareWebhookConfig | null {
  const name = environment(env);
  const signatureKey = env.SQUARE_WEBHOOK_SIGNATURE_KEY?.trim();
  const url = env.SQUARE_WEBHOOK_URL?.trim();
  if (!name || !signatureKey || !url) return null;
  try {
    const parsed = new URL(url);
    const local = parsed.protocol === "http:" && parsed.hostname === "localhost" && !env.VERCEL_ENV;
    if (parsed.protocol !== "https:" && !local) return null;
  } catch {
    return null;
  }
  return { environment: name, signatureKey, notificationUrl: url };
}
