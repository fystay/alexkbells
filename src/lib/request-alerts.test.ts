import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { Db } from "./coach/db";
import { testDb } from "./coach/test-support";
import { MAX_ALERT_ATTEMPTS, recordAlert, retryFailedAlerts } from "./request-alerts";
import { saveRequest, type StoredRequest } from "./request-store";

const mail = { apiKey: "re_test", to: "alex@example.com", from: "bookings@example.com", endpoint: "https://mail.test/emails" };

let db: Db;
let sql: (q: string, p?: unknown[]) => Promise<Record<string, unknown>[]>;
let n = 0;

/** Resend stand-in: answers with the given status and, like Resend, drops a repeated idempotency key it accepted. */
function mailServer(status: () => number) {
  const accepted = new Map<string, unknown>();
  const calls: { key: string; body: Record<string, unknown> }[] = [];
  const fetchImpl = (async (url: string, init: RequestInit) => {
    if (!String(url).startsWith(mail.endpoint)) return db.fetchImpl(url, init);
    const key = (init.headers as Record<string, string>)["Idempotency-Key"];
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    calls.push({ key, body });
    if (accepted.has(key)) return Response.json({ id: "same" });
    const code = status();
    if (code === 200) accepted.set(key, body);
    return Response.json({ id: "x" }, { status: code });
  }) as typeof fetch;
  return { fetchImpl, calls, delivered: () => accepted.size };
}

async function stored(overrides: Partial<StoredRequest> = {}): Promise<StoredRequest> {
  n += 1;
  const request: StoredRequest = {
    idempotencyKey: `booking-request/alert-${n}`,
    kind: "booking",
    service: "Group class",
    summary: "Saturday 24 October 2026, 10:15 am",
    name: `Alert Person ${n}`,
    email: `alert${n}@example.com`,
    phone: "",
    message: "",
    details: {},
    ...overrides,
  };
  expect(await saveRequest(db.config, request, db.fetchImpl)).toBe(true);
  return request;
}

const email = (r: StoredRequest) => ({ subject: `Group class booking request: ${r.name}`, text: `Name: ${r.name}\nEmail: ${r.email}` });
const row = async (key: string) => (await sql("select alert_status, alert_attempts, alert_error, alert_sent_at, alert_subject, alert_text from akb_booking_requests where idempotency_key = $1", [key]))[0];
const ago = (ms: number) => new Date(Date.now() - ms).toISOString();

beforeAll(async () => {
  ({ db, sql } = await testDb());
}, 60_000);

afterEach(() => vi.restoreAllMocks());

describe("recording the first alert", () => {
  it("marks a sent alert, and a later failure for the same request never undoes it", async () => {
    const r = await stored();
    expect(await recordAlert(db.config, r.idempotencyKey, email(r), { ok: true }, new Date(), db.fetchImpl)).toBe(true);
    expect(await row(r.idempotencyKey)).toMatchObject({ alert_status: "sent", alert_error: "", alert_subject: email(r).subject });
    await recordAlert(db.config, r.idempotencyKey, email(r), { ok: false, status: 500 }, new Date(), db.fetchImpl);
    expect(await row(r.idempotencyKey)).toMatchObject({ alert_status: "sent" });
  });

  it("marks a failure with a code only, and a later success replaces it", async () => {
    const r = await stored();
    await recordAlert(db.config, r.idempotencyKey, email(r), { ok: false, status: null }, new Date(), db.fetchImpl);
    expect(await row(r.idempotencyKey)).toMatchObject({ alert_status: "failed", alert_attempts: 1, alert_error: "network", alert_text: email(r).text });
    await recordAlert(db.config, r.idempotencyKey, email(r), { ok: true }, new Date(), db.fetchImpl);
    expect(await row(r.idempotencyKey)).toMatchObject({ alert_status: "sent", alert_error: "" });
  });

  it("reports (doesn't throw) when the alert columns can't be written, e.g. before the migration", async () => {
    const broken = (async () => new Response('{"code":"PGRST204"}', { status: 400 })) as unknown as typeof fetch;
    expect(await recordAlert(db.config, "booking-request/none", { subject: "s", text: "t" }, { ok: true }, new Date(), broken)).toBe(false);
  });
});

describe("retrying failed alerts", () => {
  async function failedAt(createdAt: string, attempts = 1) {
    const r = await stored();
    await recordAlert(db.config, r.idempotencyKey, email(r), { ok: false, status: 503 }, new Date(), db.fetchImpl);
    await sql("update akb_booking_requests set created_at = $2, alert_attempts = $3 where idempotency_key = $1", [r.idempotencyKey, createdAt, attempts]);
    return r;
  }

  it("resends the identical email with the request's key, once", async () => {
    await sql("update akb_booking_requests set alert_status = 'sent' where alert_status = 'failed'");
    const r = await failedAt(ago(60 * 60 * 1000));
    const server = mailServer(() => 200);
    expect(await retryFailedAlerts(db.config, mail, { fetchImpl: server.fetchImpl })).toEqual({ ok: true, found: 1, sent: 1, failed: 0 });
    expect(server.calls).toHaveLength(1);
    expect(server.calls[0].key).toBe(r.idempotencyKey);
    expect(server.calls[0].body).toMatchObject({ subject: email(r).subject, text: email(r).text, reply_to: r.email, to: [mail.to] });
    expect(await row(r.idempotencyKey)).toMatchObject({ alert_status: "sent", alert_attempts: 2 });
    // A second run finds nothing to do.
    expect(await retryFailedAlerts(db.config, mail, { fetchImpl: server.fetchImpl })).toMatchObject({ found: 0, sent: 0 });
    expect(server.calls).toHaveLength(1);
  });

  it("skips alerts too new, outside the provider's 24-hour window, or out of attempts", async () => {
    await sql("update akb_booking_requests set alert_status = 'sent' where alert_status = 'failed'");
    const fresh = await failedAt(ago(60 * 1000));
    const old = await failedAt(ago(25 * 60 * 60 * 1000));
    const spent = await failedAt(ago(60 * 60 * 1000), MAX_ALERT_ATTEMPTS);
    const server = mailServer(() => 200);
    expect(await retryFailedAlerts(db.config, mail, { fetchImpl: server.fetchImpl })).toMatchObject({ found: 0 });
    expect(server.calls).toHaveLength(0);
    for (const r of [fresh, old, spent]) expect(await row(r.idempotencyKey)).toMatchObject({ alert_status: "failed" });
  });

  it("two runs at once send each alert once", async () => {
    await sql("update akb_booking_requests set alert_status = 'sent' where alert_status = 'failed'");
    await failedAt(ago(2 * 60 * 60 * 1000));
    await failedAt(ago(3 * 60 * 60 * 1000));
    const server = mailServer(() => 200);
    const [a, b] = await Promise.all([
      retryFailedAlerts(db.config, mail, { fetchImpl: server.fetchImpl }),
      retryFailedAlerts(db.config, mail, { fetchImpl: server.fetchImpl }),
    ]);
    expect(a.sent + b.sent).toBe(2);
    expect(server.calls).toHaveLength(2);
    expect(server.delivered()).toBe(2);
  });

  it("a failed retry stays failed, counts the attempt and logs no personal data", async () => {
    await sql("update akb_booking_requests set alert_status = 'sent' where alert_status = 'failed'");
    const r = await failedAt(ago(60 * 60 * 1000));
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const server = mailServer(() => 500);
    expect(await retryFailedAlerts(db.config, mail, { fetchImpl: server.fetchImpl })).toMatchObject({ found: 1, sent: 0, failed: 1 });
    expect(await row(r.idempotencyKey)).toMatchObject({ alert_status: "failed", alert_attempts: 2, alert_error: "http-500" });
    const logged = log.mock.calls.flat().join(" ");
    expect(logged).toContain("http-500");
    expect(logged).not.toContain(r.email);
    expect(logged).not.toContain(r.name);
    expect(logged).not.toContain(mail.apiKey);
  });

  it("reports when failed alerts can't be read", async () => {
    const down = (async () => new Response("{}", { status: 503 })) as unknown as typeof fetch;
    expect(await retryFailedAlerts(db.config, mail, { fetchImpl: down })).toEqual({ ok: false, found: 0, sent: 0, failed: 0 });
  });
});
