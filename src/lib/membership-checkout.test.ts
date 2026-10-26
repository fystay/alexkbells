import { beforeAll, describe, expect, it } from "vitest";
import { publishedClasses, type PublishedClass } from "./class-sessions";
import { rpc, type Db } from "./coach/db";
import { addDays, londonToday, type DateKey } from "./coach/time";
import { testDb } from "./coach/test-support";
import { notifyNewMembers, sendRenewalLinks, signupStatus, startCheckout } from "./membership-checkout";
import type { MembershipRequest } from "./membership-request";
import type { SquareConfig, SquareWebhookConfig } from "./square/config";
import { squareSignature } from "./square/signature";
import { handleSquareWebhook } from "./square/sync";

/**
 * Joining and paying online, end to end against the real migrations: the
 * join creates a sign-up and a Square link; a signed webhook (re-read from the
 * Square stand-in) records the payment; the database starts the membership;
 * Alex and the member are emailed once; renewals email a pay link once.
 */

const square: SquareConfig = { environment: "sandbox", baseUrl: "https://connect.squareupsandbox.com", accessToken: "EAAA-sandbox-token-not-real", locationId: "LOC-TEST" };
const webhook: SquareWebhookConfig = { environment: "sandbox", signatureKey: "test-signature-key-not-real", notificationUrl: "https://alexkbells.vercel.app/api/square/webhook" };
const RESEND = "http://localhost:3299/emails";
const env = { RESEND_API_KEY: "re_test", BOOKING_NOTIFY_EMAIL: "alex@example.com", BOOKING_FROM_EMAIL: "RAENG <bookings@example.com>", RESEND_API_URL: RESEND, SITE_URL: "https://raeng.example" };

let db: Db;
let sql: (q: string, p?: unknown[]) => Promise<Record<string, unknown>[]>;
let ids = 0;

/** Square and Resend stand-ins: payment links (idempotent, like Square), payments, and sent emails. */
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
        links.set(key, { id: `LINK-${i}`, order_id: `ORDER-${i}`, url: `https://sandbox.square.link/u/join${i}` });
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
      const id = `PAY-${++ids}`;
      payments.set(id, { id, status: "COMPLETED", order_id: orderId, location_id: square.locationId, total_money: { amount, currency: "GBP" }, created_at: new Date().toISOString() });
      return id;
    },
  };
}

let e = 0;
function deliver(api: ReturnType<typeof services>, paymentId: string) {
  const raw = JSON.stringify({ merchant_id: "MLTEST", type: "payment.updated", event_id: `join-evt-${++e}`, created_at: new Date().toISOString(), data: { type: "payment", id: paymentId, object: {} } });
  return handleSquareWebhook(db, square, webhook, raw, squareSignature(raw, webhook.signatureKey, webhook.notificationUrl), api.fetchImpl);
}

/** The next date (2 to 8 days on) that a published class runs, so it's inside the first four weeks. */
function upcomingClass(): { cls: PublishedClass; date: DateKey } {
  const classes = publishedClasses();
  const names = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  for (let i = 2; i < 9; i++) {
    const date = addDays(londonToday(), i);
    const day = names[new Date(`${date}T12:00:00Z`).getUTCDay()];
    const cls = classes.find((c) => c.day === day);
    if (cls) return { cls, date };
  }
  throw new Error("no class in the next week");
}

let n = 0;
function request(extra: Partial<MembershipRequest> = {}): MembershipRequest {
  n += 1;
  return { plan: "regular", session: "", classDate: "", experience: "new", name: `Joiner ${n}`, email: `joiner${n}@example.com`, phone: "", message: "", submissionId: `sub-${n}`, ...extra } as MembershipRequest;
}

const orderFor = async (signupId: string) =>
  String((await sql("select l.square_order_id from akb_square_payment_links l join akb_membership_signups s on s.charge_id = l.charge_id where s.id = $1", [signupId]))[0].square_order_id);

beforeAll(async () => {
  ({ db, sql } = await testDb());
  await sql("insert into akb_database_role (role) values ('test')");
}, 60_000);

describe("joining and paying online", () => {
  it("opens Square's page for the plan's price from content, coming back to the site afterwards", async () => {
    const api = services();
    const data = request({ plan: "regular" });
    const out = await startCheckout(db, square, data, null, { agreedAt: new Date().toISOString(), idempotencyKey: `join-key-${n}`, env, fetchImpl: api.fetchImpl });
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.url).toMatch(/^https:\/\/sandbox\.square\.link\/u\/join\d+$/);
    expect(api.linkCalls[0]).toMatchObject({
      quick_pay: { name: "Regular membership, first 4 weeks", price_money: { amount: 6500, currency: "GBP" }, location_id: "LOC-TEST" },
      pre_populated_data: { buyer_email: data.email },
      checkout_options: { redirect_url: `https://raeng.example/memberships/join/done?signup=${out.signupId}` },
    });
    // Nothing starts before Square confirms.
    expect(await signupStatus(db, out.signupId)).toMatchObject({ status: "awaiting_payment", plan_name: "Regular", payUrl: out.url });
    expect(await sql("select count(*)::int as n from akb_memberships m join akb_membership_signups s on s.client_id = m.client_id where s.id = $1", [out.signupId])).toEqual([{ n: 0 }]);
    // The same submission again opens the same link, with no second charge.
    const again = await startCheckout(db, square, data, null, { agreedAt: new Date().toISOString(), idempotencyKey: `join-key-${n}`, env, fetchImpl: api.fetchImpl });
    expect(again.ok && again.url).toBe(out.url);
  });

  it("starts the membership when Square's verified payment arrives, books the first class, and emails Alex and the member once", async () => {
    const api = services();
    const { cls, date } = upcomingClass();
    const data = request({ plan: "starter", session: cls.label, classDate: date });
    const out = await startCheckout(db, square, data, cls, { agreedAt: new Date().toISOString(), idempotencyKey: `join-key-${n}`, env, fetchImpl: api.fetchImpl });
    if (!out.ok) throw new Error(out.reason);

    const pid = api.pay(await orderFor(out.signupId), 4000);
    expect((await deliver(api, pid)).status).toBe(200);
    expect(await signupStatus(db, out.signupId)).toMatchObject({ status: "active", first_class: "booked", payUrl: null });
    const [m] = await sql("select m.pay_online, m.credits from akb_memberships m join akb_membership_signups s on s.membership_id = m.id where s.id = $1", [out.signupId]);
    expect(m).toEqual({ pay_online: true, credits: 4 });

    expect(await notifyNewMembers(db, publishedClasses(), env, api.fetchImpl)).toBe(1);
    expect(api.emails.map((x) => x.to[0])).toEqual(["alex@example.com", data.email]);
    expect(api.emails[0].subject).toBe(`New member: ${data.name} (Starter, paid online)`);
    expect(api.emails[1].text).toContain("Your first class is booked");
    expect(api.emails[1].text).toContain("https://raeng.example/account/sign-in");
    // Once only, however often it runs (webhook retries, the daily reconcile).
    expect(await notifyNewMembers(db, publishedClasses(), env, api.fetchImpl)).toBe(0);
    expect(api.emails).toHaveLength(2);
    // A repeated webhook records nothing twice.
    expect((await deliver(api, pid)).status).toBe(200);
    expect(await sql("select count(*)::int as n from akb_payments where provider_payment_id = $1", [pid])).toEqual([{ n: 1 }]);
  });

  it("an existing member can't join twice", async () => {
    const api = services();
    const data = request();
    const out = await startCheckout(db, square, data, null, { agreedAt: new Date().toISOString(), idempotencyKey: `join-key-${n}`, env, fetchImpl: api.fetchImpl });
    if (!out.ok) throw new Error(out.reason);
    await deliver(api, api.pay(await orderFor(out.signupId), 6500));
    const second = await startCheckout(db, square, { ...data, submissionId: "another" }, null, { agreedAt: new Date().toISOString(), idempotencyKey: `join-key-${n}-b`, env, fetchImpl: api.fetchImpl });
    expect(second).toEqual({ ok: false, reason: "already_member" });
  });

  it("renewals: a pay link for each new period is emailed once, and the credits wait for it", async () => {
    const api = services();
    const data = request({ plan: "dedicated" });
    const out = await startCheckout(db, square, data, null, { agreedAt: new Date().toISOString(), idempotencyKey: `join-key-${n}`, env, fetchImpl: api.fetchImpl });
    if (!out.ok) throw new Error(out.reason);
    await deliver(api, api.pay(await orderFor(out.signupId), 8500));
    // Four weeks on: move the first period back and renew today.
    const [{ membership_id: mid, client_id: cid }] = (await sql("select membership_id, client_id from akb_membership_signups where id = $1", [out.signupId])) as { membership_id: string; client_id: string }[];
    await sql("update akb_membership_periods set period_start = period_start - 28, period_end = period_end - 28 where membership_id = $1", [mid]);
    await sql("update akb_memberships set next_period_on = $2 where id = $1", [mid, londonToday()]);
    expect(await rpc(db, "akb_renew_memberships", { p_today: londonToday() })).toMatchObject({ ok: true });
    expect(await rpc(db, "akb_member_payment_due", { p_client: cid })).toMatchObject({ ok: true, data: { outstanding_pence: 8500 } });

    const sent = await sendRenewalLinks(db, square, londonToday(), env, api.fetchImpl);
    expect(sent.sent).toBeGreaterThanOrEqual(1);
    const mail = api.emails.find((x) => x.to[0] === data.email);
    expect(mail?.subject).toBe("Your RAENG Dedicated membership has renewed");
    expect(mail?.text).toMatch(/Pay £85 securely with Square to use this period's credits:\nhttps:\/\/sandbox\.square\.link\/u\/join\d+/);
    const before = api.emails.length;
    await sendRenewalLinks(db, square, londonToday(), env, api.fetchImpl);
    expect(api.emails.length).toBe(before);
  });
});
