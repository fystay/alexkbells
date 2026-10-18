import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { createClient } from "../coach/clients";
import { select, type Db } from "../coach/db";
import { addCharge, getCharge, recordPayment, recordRefund, setPaymentStatus, voidCharge } from "../coach/ledger";
import { testDb } from "../coach/test-support";
import { squareConfig, squareWebhookConfig, type SquareConfig, type SquareWebhookConfig } from "./config";
import { squareSignature, verifySquareSignature } from "./signature";
import { createChargeLink, handleSquareWebhook, reconcileOpenLinks } from "./sync";

const square: SquareConfig = { environment: "sandbox", baseUrl: "https://connect.squareupsandbox.com", accessToken: "EAAA-sandbox-token-not-real", locationId: "LOC-TEST" };
const webhook: SquareWebhookConfig = { environment: "sandbox", signatureKey: "test-signature-key-not-real", notificationUrl: "https://alexkbells.vercel.app/api/square/webhook" };

let db: Db;
let sql: (q: string, p?: unknown[]) => Promise<Record<string, unknown>[]>;
let n = 0;
/** Square ids are unique across the whole run, as in Square. */
let squareIds = 0;

/**
 * Square stand-in: payment links, payments, refunds and orders held in memory.
 * Like Square, a repeated CreatePaymentLink idempotency key returns the same link.
 */
function squareApi() {
  const links = new Map<string, { id: string; order_id: string; url: string }>();
  const payments = new Map<string, Record<string, unknown>>();
  const refunds = new Map<string, Record<string, unknown>>();
  const orders = new Map<string, string[]>();
  const calls: { method: string; path: string; headers: Record<string, string>; body: Record<string, unknown> | null }[] = [];
  let down = false;
  const fetchImpl = (async (url: string, init: RequestInit = {}) => {
    if (!String(url).startsWith(square.baseUrl)) return db.fetchImpl(url, init);
    const path = String(url).slice(square.baseUrl.length);
    const body = init.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : null;
    calls.push({ method: init.method ?? "GET", path, headers: init.headers as Record<string, string>, body });
    if (down) return Response.json({ errors: [{ code: "INTERNAL_SERVER_ERROR" }] }, { status: 500 });
    if (path === "/v2/online-checkout/payment-links") {
      const key = String(body!.idempotency_key);
      if (!links.has(key)) {
        const i = ++squareIds;
        links.set(key, { id: `LINK-${i}`, order_id: `ORDER-${i}`, url: `https://sandbox.square.link/u/test${i}` });
      }
      return Response.json({ payment_link: links.get(key) });
    }
    const [, , kind, id] = path.split("/");
    const map = kind === "payments" ? payments : kind === "refunds" ? refunds : null;
    if (map) return map.has(id) ? Response.json({ [kind.slice(0, -1)]: map.get(id) }) : Response.json({ errors: [] }, { status: 404 });
    if (kind === "orders") return Response.json({ order: { id, tenders: (orders.get(id) ?? []).map((p) => ({ payment_id: p })) } });
    return Response.json({}, { status: 404 });
  }) as typeof fetch;
  return {
    fetchImpl,
    calls,
    links,
    setDown: (value: boolean) => (down = value),
    pay(orderId: string, amount: number, status = "COMPLETED", extra: Record<string, unknown> = {}) {
      const id = `PAY-${++squareIds}`;
      payments.set(id, { id, status, order_id: orderId, location_id: square.locationId, total_money: { amount, currency: "GBP" }, created_at: "2026-10-20T10:00:00Z", ...extra });
      orders.set(orderId, [...(orders.get(orderId) ?? []), id]);
      return id;
    },
    setPayment(id: string, patch: Record<string, unknown>) {
      payments.set(id, { ...payments.get(id), ...patch });
    },
    refund(paymentId: string, amount: number, status = "COMPLETED") {
      const id = `REF-${++squareIds}`;
      refunds.set(id, { id, status, payment_id: paymentId, location_id: square.locationId, amount_money: { amount, currency: "GBP" }, created_at: "2026-10-21T09:00:00Z" });
      return id;
    },
  };
}

function signed(event: Record<string, unknown>) {
  const raw = JSON.stringify(event);
  return { raw, signature: squareSignature(raw, webhook.signatureKey, webhook.notificationUrl) };
}

let e = 0;
function deliver(api: ReturnType<typeof squareApi>, type: string, objectId: string, eventId = `evt-${++e}`) {
  const { raw, signature } = signed({ merchant_id: "MLTEST", type, event_id: eventId, created_at: "2026-10-20T10:00:01Z", data: { type: type.split(".")[0], id: objectId, object: {} } });
  return handleSquareWebhook(db, square, webhook, raw, signature, api.fetchImpl);
}

async function chargeFor(pence = 1000) {
  n += 1;
  const c = await createClient(db, { full_name: `Square ${n}`, email: `square${n}@example.com`, phone: "", instagram: "", preferred_contact: "", status: "active", notes: "" });
  if (!c.ok) throw new Error("client");
  const ch = await addCharge(db, { clientId: c.data.id, service: "group", description: "Group class, Sat 24 Oct", amountPence: pence, dueOn: "2026-10-24" });
  if (!ch.ok) throw new Error("charge");
  return { client: c.data.id, charge: ch.data.id };
}

async function openLink(api: ReturnType<typeof squareApi>, pence = 1000) {
  const ids = await chargeFor(pence);
  const link = await createChargeLink(db, square, ids.charge, api.fetchImpl);
  if (!link.ok) throw new Error(`link ${link.reason}`);
  const row = (await sql("select * from akb_square_payment_links where charge_id = $1", [ids.charge]))[0];
  return { ...ids, orderId: String(row.square_order_id), linkId: String(row.id) };
}

const squarePayments = (client: string) => sql("select * from akb_payments where client_id = $1 and provider like 'square%'", [client]);
const outstanding = async (charge: string) => {
  const r = await getCharge(db, charge);
  return r.ok ? r.data?.outstanding_pence : undefined;
};

beforeAll(async () => {
  ({ db, sql } = await testDb());
}, 60_000);

afterEach(() => vi.restoreAllMocks());

describe("webhook signature", () => {
  // Vector checked against the official SDK's WebhooksHelper.verifySignature (square@46.0.0).
  const body = '{"merchant_id":"MLTEST","type":"payment.updated","event_id":"evt-1","created_at":"2026-10-20T10:00:00Z","data":{"type":"payment","id":"pay-1","object":{"payment":{"id":"pay-1","status":"COMPLETED"}}}}';
  const expected = "YbsUdyGJ21Mohhzg6xFqkyvVHQfHsOubuNqnH4z4fKg=";

  it("matches Square's algorithm: base64 HMAC-SHA256 of notification URL + raw body", () => {
    expect(squareSignature(body, webhook.signatureKey, webhook.notificationUrl)).toBe(expected);
    expect(verifySquareSignature(body, expected, webhook.signatureKey, webhook.notificationUrl)).toBe(true);
  });

  it("rejects a changed body, URL, key or signature, and a missing header", () => {
    expect(verifySquareSignature(body.replace("COMPLETED", "FAILED"), expected, webhook.signatureKey, webhook.notificationUrl)).toBe(false);
    expect(verifySquareSignature(body, expected, webhook.signatureKey, "https://evil.example/api/square/webhook")).toBe(false);
    expect(verifySquareSignature(body, expected, "other-key", webhook.notificationUrl)).toBe(false);
    expect(verifySquareSignature(body, expected.replace("Y", "Z"), webhook.signatureKey, webhook.notificationUrl)).toBe(false);
    expect(verifySquareSignature(body, null, webhook.signatureKey, webhook.notificationUrl)).toBe(false);
    expect(verifySquareSignature(body, "short", webhook.signatureKey, webhook.notificationUrl)).toBe(false);
  });
});

describe("configuration", () => {
  const full = { SQUARE_ACCESS_TOKEN: "t", SQUARE_LOCATION_ID: "L", SQUARE_WEBHOOK_SIGNATURE_KEY: "k", SQUARE_WEBHOOK_URL: "https://alexkbells.vercel.app/api/square/webhook" };

  it("is off unless every setting is present", () => {
    expect(squareConfig({})).toBeNull();
    expect(squareConfig({ ...full, SQUARE_ENVIRONMENT: "sandbox", SQUARE_LOCATION_ID: "" })).toBeNull();
    expect(squareWebhookConfig({ ...full, SQUARE_ENVIRONMENT: "sandbox", SQUARE_WEBHOOK_URL: "http://alexkbells.vercel.app/x" })).toBeNull();
  });

  it("uses live Square only on Vercel production, and test Square everywhere else", () => {
    expect(squareConfig({ ...full, SQUARE_ENVIRONMENT: "production", VERCEL_ENV: "production" })).toMatchObject({ environment: "production", baseUrl: "https://connect.squareup.com" });
    expect(squareConfig({ ...full, SQUARE_ENVIRONMENT: "production", VERCEL_ENV: "preview" })).toBeNull();
    expect(squareConfig({ ...full, SQUARE_ENVIRONMENT: "production" })).toBeNull();
    expect(squareConfig({ ...full, SQUARE_ENVIRONMENT: "sandbox", VERCEL_ENV: "preview" })).toMatchObject({ environment: "sandbox", baseUrl: "https://connect.squareupsandbox.com" });
    expect(squareConfig({ ...full, SQUARE_ENVIRONMENT: "sandbox", VERCEL_ENV: "production" })).toBeNull();
    expect(squareConfig({ ...full, SQUARE_ENVIRONMENT: "Production", VERCEL_ENV: "production" })).toBeNull();
  });

  it("allows the localhost API stand-in only outside Vercel", () => {
    expect(squareConfig({ ...full, SQUARE_ENVIRONMENT: "sandbox", SQUARE_API_URL: "http://localhost:3297" })?.baseUrl).toBe("http://localhost:3297");
    expect(squareConfig({ ...full, SQUARE_ENVIRONMENT: "sandbox", SQUARE_API_URL: "http://localhost:3297", VERCEL_ENV: "preview" })?.baseUrl).toBe("https://connect.squareupsandbox.com");
    expect(squareConfig({ ...full, SQUARE_ENVIRONMENT: "sandbox", SQUARE_API_URL: "https://evil.example" })?.baseUrl).toBe("https://connect.squareupsandbox.com");
  });
});

describe("payment links", () => {
  it("asks Square for a hosted checkout of what's owed, in GBP, at Alex's location", async () => {
    const api = squareApi();
    const { charge } = await chargeFor(1000);
    const link = await createChargeLink(db, square, charge, api.fetchImpl);
    expect(link).toMatchObject({ ok: true, amountPence: 1000 });
    expect(link.ok && link.url).toMatch(/^https:\/\/sandbox\.square\.link\/u\/test\d+$/);
    const call = api.calls[0];
    expect(call.method).toBe("POST");
    expect(call.headers.Authorization).toBe(`Bearer ${square.accessToken}`);
    expect(call.headers["Square-Version"]).toBe("2026-09-16");
    expect(call.body).toMatchObject({ quick_pay: { name: "Group class, Sat 24 Oct", price_money: { amount: 1000, currency: "GBP" }, location_id: "LOC-TEST" } });
    expect(JSON.stringify(call.body)).not.toContain("@example.com");
  });

  it("one live link per charge; a retry after a failure reuses the same idempotency key", async () => {
    const api = squareApi();
    const { charge } = await chargeFor(1500);
    api.setDown(true);
    expect(await createChargeLink(db, square, charge, api.fetchImpl)).toEqual({ ok: false, reason: "square" });
    api.setDown(false);
    const first = await createChargeLink(db, square, charge, api.fetchImpl);
    const again = await createChargeLink(db, square, charge, api.fetchImpl);
    expect(first.ok && again.ok && first.url === again.url).toBe(true);
    const keys = api.calls.filter((c) => c.path === "/v2/online-checkout/payment-links").map((c) => c.body!.idempotency_key);
    expect(keys).toHaveLength(2);
    expect(new Set(keys).size).toBe(1);
    expect(await sql("select count(*)::int as n from akb_square_payment_links where charge_id = $1", [charge])).toEqual([{ n: 1 }]);
  });

  it("refuses a charge with nothing owed", async () => {
    const api = squareApi();
    const { charge } = await chargeFor(1000);
    await voidCharge(db, charge, "Free");
    expect(await createChargeLink(db, square, charge, api.fetchImpl)).toEqual({ ok: false, reason: "nothing-owed" });
    expect(api.calls).toHaveLength(0);
  });
});

describe("webhooks → ledger", () => {
  it("records a completed payment once, against its charge, only after re-reading it from Square", async () => {
    const api = squareApi();
    const { client, charge, orderId, linkId } = await openLink(api);
    const paymentId = api.pay(orderId, 1000);
    expect(await deliver(api, "payment.updated", paymentId, "evt-pay-1")).toEqual({ status: 200, body: { outcome: "recorded" } });
    expect(api.calls.some((c) => c.method === "GET" && c.path === `/v2/payments/${paymentId}`)).toBe(true);
    const rows = await squarePayments(client);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ provider: "square_sandbox", provider_payment_id: paymentId, method: "card", amount_pence: 1000, status: "received" });
    expect(await outstanding(charge)).toBe(0);
    expect((await sql("select status from akb_square_payment_links where id = $1", [linkId]))[0].status).toBe("paid");

    // The same delivery again, and a different event about the same payment.
    expect(await deliver(api, "payment.updated", paymentId, "evt-pay-1")).toEqual({ status: 200, body: { outcome: "duplicate" } });
    expect(await deliver(api, "payment.created", paymentId)).toEqual({ status: 200, body: { outcome: "duplicate" } });
    expect(await squarePayments(client)).toHaveLength(1);
  });

  it("never trusts the event body: Square's current state decides", async () => {
    const api = squareApi();
    const { client, orderId } = await openLink(api);
    const paymentId = api.pay(orderId, 1000, "APPROVED");
    expect((await deliver(api, "payment.updated", paymentId)).body).toEqual({ outcome: "pending" });
    api.setPayment(paymentId, { status: "FAILED" });
    expect((await deliver(api, "payment.updated", paymentId)).body).toEqual({ outcome: "not_paid" });
    expect(await squarePayments(client)).toHaveLength(0);
    api.setPayment(paymentId, { status: "COMPLETED" });
    expect((await deliver(api, "payment.updated", paymentId)).body).toEqual({ outcome: "recorded" });
  });

  it("rejects bad signatures and records nothing", async () => {
    const api = squareApi();
    const { client, orderId } = await openLink(api);
    const paymentId = api.pay(orderId, 1000);
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { raw, signature } = signed({ type: "payment.updated", event_id: "evt-forged", data: { type: "payment", id: paymentId } });
    expect((await handleSquareWebhook(db, square, webhook, raw.replace("evt-forged", "evt-forged2"), signature, api.fetchImpl)).status).toBe(403);
    expect((await handleSquareWebhook(db, square, webhook, raw, null, api.fetchImpl)).status).toBe(403);
    expect((await handleSquareWebhook(db, square, { ...webhook, notificationUrl: "https://other.example/hook" }, raw, signature, api.fetchImpl)).status).toBe(403);
    expect(await squarePayments(client)).toHaveLength(0);
    expect(await sql("select count(*)::int as n from akb_square_events where event_id like 'evt-forged%'")).toEqual([{ n: 0 }]);
    expect(api.calls.filter((c) => c.path.startsWith("/v2/payments"))).toHaveLength(0);
  });

  it("asks Square to redeliver when Square or the database can't be reached, then catches up", async () => {
    const api = squareApi();
    const { client, orderId } = await openLink(api);
    const paymentId = api.pay(orderId, 1000);
    api.setDown(true);
    expect(await deliver(api, "payment.updated", paymentId, "evt-retry")).toEqual({ status: 500, body: { error: "retry" } });
    expect((await sql("select processed_at, attempts, outcome from akb_square_events where event_id = 'evt-retry'"))[0]).toMatchObject({ processed_at: null, attempts: 1, outcome: "error:square-payment-500" });
    api.setDown(false);
    expect((await deliver(api, "payment.updated", paymentId, "evt-retry")).body).toEqual({ outcome: "recorded" });
    expect((await sql("select attempts from akb_square_events where event_id = 'evt-retry'"))[0].attempts).toBe(2);
    expect(await squarePayments(client)).toHaveLength(1);
  });

  it("ignores payments that aren't from our links or are at another location", async () => {
    const api = squareApi();
    const inPerson = api.pay("ORDER-IN-PERSON", 2500);
    expect((await deliver(api, "payment.updated", inPerson)).body).toEqual({ outcome: "unknown_order" });
    const { orderId } = await openLink(api);
    const elsewhere = api.pay(orderId, 1000, "COMPLETED", { location_id: "OTHER" });
    expect((await deliver(api, "payment.updated", elsewhere)).body).toEqual({ outcome: "other_location" });
    expect((await deliver(api, "customer.created", "CUST-1")).body).toEqual({ outcome: "ignored" });
  });

  it("refuses a non-GBP payment and keeps asking for redelivery", async () => {
    const api = squareApi();
    const { client, orderId } = await openLink(api);
    const paymentId = api.pay(orderId, 1000, "COMPLETED", { total_money: { amount: 1000, currency: "USD" } });
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect((await deliver(api, "payment.updated", paymentId)).status).toBe(500);
    expect(await squarePayments(client)).toHaveLength(0);
  });

  it("money beyond what's owed (or on a cancelled charge) becomes credit", async () => {
    const api = squareApi();
    const { client, charge, orderId } = await openLink(api, 1000);
    // Meanwhile the client paid £4 in cash.
    await recordPayment(db, { clientId: client, service: "group", amountPence: 400, paidOn: "2026-10-19", method: "cash", reference: "", note: "", key: `cash-${charge}`, allocations: [{ charge_id: charge, amount_pence: 400 }] });
    expect((await deliver(api, "payment.updated", api.pay(orderId, 1000))).body).toEqual({ outcome: "recorded" });
    expect(await outstanding(charge)).toBe(0);
    const bal = await select<{ credit_pence: number }>(db, "akb_client_balances", [["client_id", `eq.${client}`]]);
    expect(bal.ok && bal.data[0].credit_pence).toBe(400);

    const late = await openLink(api, 1000);
    await voidCharge(db, late.charge, "Class cancelled");
    expect((await sql("select status from akb_square_payment_links where id = $1", [late.linkId]))[0].status).toBe("cancelled");
    expect((await deliver(api, "payment.updated", api.pay(late.orderId, 1000))).body).toEqual({ outcome: "recorded" });
    const lateBal = await select<{ credit_pence: number }>(db, "akb_client_balances", [["client_id", `eq.${late.client}`]]);
    expect(lateBal.ok && lateBal.data[0].credit_pence).toBe(1000);
  });
});

describe("refunds", () => {
  it("mirrors a completed Square refund once; the charge is owed again", async () => {
    const api = squareApi();
    const { client, charge, orderId } = await openLink(api, 1000);
    const paymentId = api.pay(orderId, 1000);
    await deliver(api, "payment.updated", paymentId);
    const refundId = api.refund(paymentId, 1000, "PENDING");
    expect((await deliver(api, "refund.created", refundId)).body).toEqual({ outcome: "pending" });
    api.refund(paymentId, 0);
    const done = api.refund(paymentId, 1000);
    expect((await deliver(api, "refund.updated", done)).body).toEqual({ outcome: "recorded" });
    expect((await deliver(api, "refund.updated", done)).body).toEqual({ outcome: "duplicate" });
    const [payment] = await squarePayments(client);
    expect(await sql("select amount_pence, refunded_on::text, note from akb_refunds where payment_id = $1", [payment.id])).toEqual([{ amount_pence: 1000, refunded_on: "2026-10-21", note: "Square refund" }]);
    expect(await outstanding(charge)).toBe(1000);
  });

  it("a refund arriving before its payment's webhook records both, in order", async () => {
    const api = squareApi();
    const { client, orderId } = await openLink(api, 1000);
    const paymentId = api.pay(orderId, 1000);
    const refundId = api.refund(paymentId, 300);
    expect((await deliver(api, "refund.updated", refundId)).body).toEqual({ outcome: "recorded" });
    const [payment] = await squarePayments(client);
    expect(await sql("select amount_pence from akb_refunds where payment_id = $1", [payment.id])).toEqual([{ amount_pence: 300 }]);
  });

  it("the portal can't refund or void a Square payment (that's done in Square), but still can for cash", async () => {
    const api = squareApi();
    const { client, charge, orderId } = await openLink(api, 1000);
    await deliver(api, "payment.updated", api.pay(orderId, 1000));
    const [payment] = await squarePayments(client);
    const id = String(payment.id);
    expect(await recordRefund(db, { paymentId: id, amountPence: 100, refundedOn: "2026-10-21", note: "", key: `portal-${id}`, chargeId: charge, voidCharge: false })).toMatchObject({ ok: false, error: { rule: "provider_managed" } });
    expect(await setPaymentStatus(db, id, "void", "")).toMatchObject({ ok: false, error: { rule: "provider_managed" } });

    const cash = await recordPayment(db, { clientId: client, service: "group", amountPence: 500, paidOn: "2026-10-21", method: "cash", reference: "", note: "", key: `cash2-${id}`, allocations: [] });
    if (!cash.ok) throw new Error("cash");
    expect((await recordRefund(db, { paymentId: cash.data, amountPence: 100, refundedOn: "2026-10-21", note: "", key: `cash-refund-${id}`, chargeId: null, voidCharge: false })).ok).toBe(true);
  });
});

describe("reconciliation", () => {
  it("records payments whose webhook never arrived, without duplicating", async () => {
    const api = squareApi();
    const { client, orderId } = await openLink(api, 1000);
    api.pay(orderId, 1000);
    await sql("update akb_square_payment_links set status = 'open' where status = 'open'");
    const first = await reconcileOpenLinks(db, square, api.fetchImpl);
    expect(first.ok && first.recorded).toBe(1);
    expect((await reconcileOpenLinks(db, square, api.fetchImpl)).recorded).toBe(0);
    expect(await squarePayments(client)).toHaveLength(1);
  });
});

describe("access and logs", () => {
  it("public roles can't touch the Square tables or functions", async () => {
    for (const role of ["anon", "authenticated"]) {
      for (const relation of ["akb_square_payment_links", "akb_square_events"]) {
        await sql(`set role ${role}`);
        await expect(sql(`select * from ${relation} limit 1`), `${role} ${relation}`).rejects.toThrow(/permission denied/);
        await sql("reset role");
      }
    }
    const grants = await sql(
      `select proname, has_function_privilege('anon', oid, 'EXECUTE') as anon, has_function_privilege('authenticated', oid, 'EXECUTE') as authenticated
       from pg_proc where proname in ('akb_apply_square_payment', 'akb_apply_square_refund', 'akb_refund_apply', 'akb_square_provider') order by 1`,
    );
    expect(grants).toHaveLength(4);
    for (const g of grants) expect(g).toMatchObject({ anon: false, authenticated: false });
    const rls = await sql("select relname from pg_class where relname in ('akb_square_payment_links', 'akb_square_events') and not relrowsecurity");
    expect(rls).toEqual([]);
  });

  it("never logs the access token, signature key or customer details", async () => {
    const api = squareApi();
    const lines: string[] = [];
    vi.spyOn(console, "log").mockImplementation((...a) => void lines.push(a.join(" ")));
    vi.spyOn(console, "error").mockImplementation((...a) => void lines.push(a.join(" ")));
    const { orderId } = await openLink(api);
    const paymentId = api.pay(orderId, 1000);
    await deliver(api, "payment.updated", paymentId);
    api.setDown(true);
    await deliver(api, "payment.updated", paymentId);
    await createChargeLink(db, square, (await chargeFor()).charge, api.fetchImpl);
    await handleSquareWebhook(db, square, webhook, "{}", "bad", api.fetchImpl);
    const all = lines.join("\n");
    expect(all.length).toBeGreaterThan(0);
    for (const secret of [square.accessToken, webhook.signatureKey, "@example.com"]) expect(all).not.toContain(secret);
  });
});
