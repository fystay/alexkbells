import { beforeAll, describe, expect, it } from "vitest";
import { bookingByToken, cancelByToken, classBookingStatus, creditStatus, notifyClassBookings, startClassCheckout } from "./class-checkout";
import { publishedClasses, type PublishedClass } from "./class-sessions";
import { rpc, type Db } from "./coach/db";
import { addDays, londonToday, type DateKey } from "./coach/time";
import { testDb } from "./coach/test-support";
import { deliverStripeEvent, stripeStandIn, testStripe } from "./stripe/test-support";

/**
 * Booking a group class and paying online, end to end against the real
 * migrations: the booking holds a place and opens Stripe's page; a signed
 * webhook (re-read from the Stripe stand-in) records the payment; the database
 * confirms the place; the booker gets a private link to cancel, which (24
 * hours or more before) gives a credit link that books another class free.
 */

const stripe = testStripe;
const RESEND = "http://localhost:3299/emails";
const env = { RESEND_API_KEY: "re_test", BOOKING_NOTIFY_EMAIL: "alex@example.com", BOOKING_FROM_EMAIL: "RAENG <bookings@example.com>", RESEND_API_URL: RESEND, SITE_URL: "https://raeng.example" };

let db: Db;
let sql: (q: string, p?: unknown[]) => Promise<Record<string, unknown>[]>;

/** Stripe and Resend stand-ins, as in membership-checkout.test.ts. */
function services() {
  const emails: { to: string[]; subject: string; text: string; key: string }[] = [];
  const stripeApi = stripeStandIn(async (url, init = {}) => {
    if (String(url) === RESEND) {
      const body = JSON.parse(String(init.body)) as { to: string[]; subject: string; text: string };
      const key = (init.headers as Record<string, string>)["Idempotency-Key"];
      if (!emails.some((e) => e.key === key)) emails.push({ ...body, key });
      return Response.json({ id: "email" });
    }
    return db.fetchImpl(url, init);
  });
  return {
    fetchImpl: stripeApi.fetchImpl,
    stripeApi,
    /** The checkout sessions opened so far, as the form Stripe received. */
    get linkCalls() {
      return stripeApi.calls.filter((c) => c.method === "POST" && c.path === "/v1/checkout/sessions").map((c) => c.form);
    },
    emails,
    /** Pays a session; returns its id (what the webhook is about). */
    pay(sessionId: string, amount: number) {
      stripeApi.pay(sessionId, amount);
      return sessionId;
    },
  };
}

function deliver(api: ReturnType<typeof services>, sessionId: string) {
  return deliverStripeEvent(db, api.stripeApi, "checkout.session.completed", { id: sessionId });
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
  it("holds a place, opens Stripe for the class price, and confirms only once Stripe's payment is recorded", async () => {
    const api = services();
    const [{ cls, date }] = classesFrom(3);
    const booker = { name: "Class Payer", email: "class-payer@example.com", phone: "" };
    const out = await startClassCheckout(db, stripe, booker, cls, date, { idempotencyKey: "class-key-1", env, fetchImpl: api.fetchImpl });
    expect(out).toMatchObject({ ok: true, confirmed: false });
    if (!out.ok) return;
    const form = api.linkCalls[0];
    expect(form.get("line_items[0][price_data][unit_amount]")).toBe("1200");
    expect(form.get("line_items[0][price_data][currency]")).toBe("gbp");
    expect(form.get("customer_email")).toBe(booker.email);
    expect(form.get("success_url")).toBe(`https://raeng.example/book/done?booking=${out.bookingId}`);
    expect(await classBookingStatus(db, out.bookingId, publishedClasses())).toMatchObject({ status: "awaiting_payment", payUrl: out.url });
    // The same submission again opens the same link.
    const again = await startClassCheckout(db, stripe, booker, cls, date, { idempotencyKey: "class-key-1", env, fetchImpl: api.fetchImpl });
    expect(again.ok && again.url).toBe(out.url);
    // A second, different booking for the same class is refused.
    expect(await startClassCheckout(db, stripe, booker, cls, date, { idempotencyKey: "class-key-2", env, fetchImpl: api.fetchImpl })).toEqual({ ok: false, reason: "already_booked" });

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
    const free = await startClassCheckout(db, stripe, booker, next.cls, next.date, { idempotencyKey: "class-key-3", creditToken: credit, env, fetchImpl: api.fetchImpl });
    expect(free).toMatchObject({ ok: true, confirmed: true });
    if (free.ok) expect(free.url).toBe(`https://raeng.example/book/done?booking=${free.bookingId}`);
    // No Stripe page for a credit booking (the same submission earlier reused its open link).
    expect(api.linkCalls).toHaveLength(1);
    expect((await creditStatus(db, credit))?.usable).toBe(false);
    // A used credit can't be used again.
    const later = classesFrom(4)[2];
    expect(await startClassCheckout(db, stripe, booker, later.cls, later.date, { idempotencyKey: "class-key-4", creditToken: credit, env, fetchImpl: api.fetchImpl })).toEqual({ ok: false, reason: "credit_invalid" });
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
