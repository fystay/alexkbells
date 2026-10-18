import { NextResponse } from "next/server";
import { coachDb } from "@/lib/coach/db";
import { squareConfig, squareWebhookConfig } from "@/lib/square/config";
import { handleSquareWebhook, MAX_WEBHOOK_BYTES } from "@/lib/square/sync";

/**
 * Square webhook endpoint (payment.created/updated, refund.created/updated).
 * Signature checked on the raw body first; then the payment or refund is
 * re-read from Square and recorded once. Off (404) unless Square is configured.
 */
export async function POST(request: Request) {
  const db = coachDb();
  const square = squareConfig();
  const webhook = squareWebhookConfig();
  const noStore = { "Cache-Control": "no-store" };
  if (!db || !square || !webhook || square.environment !== webhook.environment) {
    return NextResponse.json({ error: "not-configured" }, { status: 404, headers: noStore });
  }
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > MAX_WEBHOOK_BYTES) return NextResponse.json({ error: "too-large" }, { status: 413, headers: noStore });
  const raw = await request.text();
  const result = await handleSquareWebhook(db, square, webhook, raw, request.headers.get("x-square-hmacsha256-signature"));
  return NextResponse.json(result.body, { status: result.status, headers: noStore });
}
