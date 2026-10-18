import { timingSafeEqual } from "node:crypto";
import type { Env } from "./env";

/**
 * True only for "Bearer <CRON_SECRET>", compared in constant time. With no
 * CRON_SECRET (or one shorter than 16 characters) every call is refused.
 */
export function cronAuthorized(header: string | null, env: Env = process.env): boolean {
  const secret = env.CRON_SECRET?.trim();
  if (!secret || secret.length < 16 || !header) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const given = Buffer.from(header);
  return given.length === expected.length && timingSafeEqual(given, expected);
}
