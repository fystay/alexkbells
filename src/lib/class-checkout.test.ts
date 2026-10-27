import { beforeAll, describe, expect, it } from "vitest";
import { bookingByToken, cancelByToken, classBookingStatus, creditStatus, notifyClassBookings, startClassCheckout } from "./class-checkout";
import { publishedClasses, type PublishedClass } from "./class-sessions";
import { rpc, type Db } from "./coach/db";
import { addDays, londonToday, type DateKey } from "./coach/time";
import { testDb } from "./coach/test-support";
import type { SquareConfig, SquareWebhookConfig } from "./square/config";
import { squareSignature } from "./square/signature";
import { handleSquareWebhook } from "./square/sync";

/**
 * Booking a group class and paying online, end to end against the real
 * migrations: the booking holds a place and opens Square's page; a signed
 * webhook (re-read from the Square stand-in) records the payment; the database
 * confirms the place; the booker gets a private link to cancel, which (24
 * hours or more before) gives a credit link that books another class free.
 */

const square: SquareConfig = { environment: "sandbox", baseUrl: "https://connect.squareupsandbox.com", accessToken: "EAAA-sandbox-token-not-real", locationId: "LOC-TEST" };
const webhook: SquareWebhookConfig = { environment: "sandbox", signatureKey: "test-signature-key-not-real", notificationUrl: "https://alexkbells.vercel.app/api/square/webhook" };
const RESEND = "http://localhost:3299/emails";
const env = { RESEND_API_KEY: "re_test", BOOKING_NOTIFY_EMAIL: "alex@example.com", BOOKING_FROM_EMAIL: "RAENG <bookings@example.com>", RESEND_API_URL: RESEND, SITE_URL: "https://raeng.example" };

let db: Db;
let sql: (q: string, p?: unknown[]) => Promise<Record<string, unknown>[]>;
let ids = 0;

/** Square and Resend stand-ins, as in membership-checkout.test.ts. */
function services() {
  const links = new Map<string, { id: string; order_id: string; url: string }>();
  const payments = new Map<string, Record<string, unknown>>();
  const linkCalls: Record<string, unknown>[] = [];
  const emails: { to: string[]; subject: string; text: string; key: string }[] = [];
  const fetchImpl = (async (url: string, init: RequestInit = {}) => {
    const u = String(url);
    const body = init.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : null;
    if (u === RESEND) {
      const key = (init.headers as Record<string, string>)["Idempotency-Key"];
      if (!emails.some((e) => e.key === key)) emails.push({ ...(body as { to: string[]; subject: string; text: string }), key });
      return Response.json({ id: "email" });
    }
    if (!u.startsWith(square.baseUrl)) return db.fetchImpl(url, init);
    const path = u.slice(square.baseUrl.length);
    if (path === "/v2/online-checkout/payment-links") {
      linkCalls.push(body!);
      const key = String(body!.idempotency_key);
      if (!links.has(key)) {
        const i = ++ids;
        links.set(key, { id: `CLINK-${i}`, order_id: `CORDER-${i}`, url: `https://sandbox.square.link/u/class${i}` });
      }
      return Response.json({ payment_link: links.get(key) });
    }
    const [, , kind, id] = path.split("/");
    if (kind === "payments") return payments.has(id) ? Response.json({ payment: payments.get(id) }) : Response.json({ errors: [] }, { status: 404 });
    return Response.json({}, { status: 404 });
  }) as typeof fetch;
  return {
    fetchImpl,
    linkCalls,
    emails,
    pay(orderId: string, amount: number) {
      const id = `CPAY-${++ids}`;
      payments.set(id, { id, status: "COMPLETED", order_id: orderId, location_id: square.locationId, total_money: { amount, currency: "GBP" }, created_at: new Date().toISOString() });
      return id;
    },
  };
}

let e = 0;
function deliver(api: ReturnType<typeof services>, paymentId: string) {
  const raw = JSON.stringify({ merchant_id: "MLTEST", type: "payment.updated", event_id: `class-evt-${++e}`, created_at: new Date().toISOString(), data: { type: "payment", id: paymentId, object: {} } });
  return handleSquareWebhook(db, square, webhook, raw, squareSignature(raw, webhook.signatureKey, webhook.notificationUrl), api.fetchImpl);
}

/** Published classes from `from` days on, in date order. */
function classesFrom(from: number): { cls: PublishedClass; date: DateKey }[] {
  const classes = publishedClasses();
  const names = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const out: { cls: PublishedClass; date: DateKey }[] = [];
  for (let i = from; i < from + 14; i++) {
    const date = addDays(londonToday(), i);
    const day = names[new Date(`${date}T12:00:00Z`).getUTCDay()];
    for (const cls of classes.filter((c) => c.day === day)) out.push({ cls, date });
  }
  return out;
}

const orderFor = async (bookingId: string) =>
  String((await sql("select l.square_order_id from akb_square_payment_links l join akb_class_bookings b on b.charge_id = l.charge_id where b.id = $1", [bookingId]))[0].square_order_id);

const tokenFrom = (text: string, path: string) => new RegExp(`${path}\\?(?:token|credit)=([A-Za-z0-9_-]{43})`).exec(text)?.[1] ?? "";

beforeAll(async () => {
  ({ db, sql } = await testDb());
  await sql("insert into akb_database_role (role) values ('test')");
}, 60_000);

describe("booking a group class and paying online", () => {
  it("holds a place, opens Square for the class price, and confirms only once Square's payment is recorded", async () => {
    const api = services();
    const [{ cls, date }] = classesFrom(3);
    const booker = { name: "Class Payer", email: "class-payer@example.com", phone: "" };
    const out = await startClassCheckout(db, square, booker, cls, date, { idempotencyKey: "class-key-1", env, fetchImpl: api.fetchImpl });
    expect(out).toMatchObject({ ok: true, confirmed: false });
    if (!out.ok) return;
    expect(api.linkCalls[0]).toMatchObject({
      quick_pay: { price_money: { amount: 1200, currency: "GBP" }, location_id: "LOC-TEST" },
      pre_populated_data: { buyer_email: booker.email },
      checkout_options: { redirect_url: `https://raeng.example/book/done?booking=${out.bookingId}` },
    });
    expect(await classBookingStatus(db, out.bookingId, publishedClasses())).toMatchObject({ status: "awaiting_payment", payUrl: out.url });
    // The same submission again opens the same link.
    const again = await startClassCheckout(db, square, booker, cls, date, { idempotencyKey: "class-key-1", env, fetchImpl: api.fetchImpl });
    expect(again.ok && again.url).toBe(out.url);
    // A second, different booking for the same class is refused.
    expect(await startClassCheckout(db, square, booker, cls, date, { idempotencyKey: "class-key-2", env, fetchImpl: api.fetchImpl })).toEqual({ ok: false, reason: "already_booked" });

    expect(await notifyClassBookings(db, publishedClasses(), env, api.fetchImpl)).toBe(0);
    expect((await deliver(api, api.pay(await orderFor(out.bookingId), 1200))).status).toBe(200);
    expect((await classBookingStatus(db, out.bookingId, publishedClasses()))?.status).toBe("confirmed");

    // Alex is told (nothing to confirm); the booker gets a private link to cancel. Once each.
    expect(await notifyClassBookings(db, publishedClasses(), env, api.fetchImpl)).toBe(1);
    expect(await notifyClassBookings(db, publishedClasses(), env, api.fetchImpl)).toBe(0);
    const alex = api.emails.find((m) => m.to.includes("alex@example.com"));
    expect(alex?.subject).toMatch(/^Class booked: Class Payer, /);
    expect(alex?.text).toContain("nothing to confirm");
    const mine = api.emails.find((m) => m.to.includes(booker.email));
    expect(mine?.subject).toMatch(/^You're booked: /);
    expect(mine?.text).toContain("Cancel 24 hours or more before");
    const manage = tokenFrom(mine?.text ?? "", "https://raeng.example/book/manage");
    expect(manage).toHaveLength(43);

    // Cancelling in time gives a credit link (also emailed), which books another class with nothing to pay.
    expect(await bookingByToken(db, manage, publishedClasses())).toMatchObject({ status: "confirmed", canCancel: true, creditBack: true });
    const cancelled = await cancelByToken(db, manage, env, api.fetchImpl);
    expect(cancelled.ok).toBe(true);
    if (!cancelled.ok || !cancelled.creditLink) throw new Error("expected a credit");
    expect(cancelled.creditLink).toMatch(/^https:\/\/raeng\.example\/book\/group-class\?credit=/);
    expect(api.emails.find((m) => m.subject === "Your class credit")?.text).toContain(cancelled.creditLink);
    expect((await bookingByToken(db, manage, publishedClasses()))?.status).toBe("cancelled");
    expect(await cancelByToken(db, manage, env, api.fetchImpl)).toEqual({ ok: false, reason: "not_booked" });

    const credit = tokenFrom(cancelled.creditLink, "https://raeng.example/book/group-class");
    expect(await creditStatus(db, credit)).toEqual({ usable: true, expiresOn: addDays(londonToday(), 28) });
    const next = classesFrom(4)[1];
    const free = await startClassCheckout(db, square, booker, next.cls, next.date, { idempotencyKey: "class-key-3", creditToken: credit, env, fetchImpl: api.fetchImpl });
    expect(free).toMatchObject({ ok: true, confirmed: true });
    if (free.ok) expect(free.url).toBe(`https://raeng.example/book/done?booking=${free.bookingId}`);
    // No Square page for a credit booking (the same submission earlier reused its open link).
    expect(api.linkCalls).toHaveLength(1);
    expect((await creditStatus(db, credit))?.usable).toBe(false);
    // A used credit can't be used again.
    const later = classesFrom(4)[2];
    expect(await startClassCheckout(db, square, booker, later.cls, later.date, { idempotencyKey: "class-key-4", creditToken: credit, env, fetchImpl: api.fetchImpl })).toEqual({ ok: false, reason: "credit_invalid" });
  });

  it("an unknown or malformed link finds nothing", async () => {
    expect(await bookingByToken(db, "not-a-token", publishedClasses())).toBeNull();
    expect(await bookingByToken(db, "a".repeat(43), publishedClasses())).toBeNull();
    expect(await creditStatus(db, "b".repeat(43))).toBeNull();
    expect(await classBookingStatus(db, "00000000-0000-4000-8000-000000000000", publishedClasses())).toBeNull();
  });

  it("the hold release runs", async () => {
    const r = await rpc<number>(db, "akb_release_class_holds", {});
    expect(r.ok).toBe(true);
  });
});
