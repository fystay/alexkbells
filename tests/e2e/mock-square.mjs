// Stand-in for Square during e2e tests: payment links, a hosted "checkout"
// page, payments and orders. Paying on the checkout page does what Square
// does: records a COMPLETED payment, sends a signed payment.updated webhook to
// the site, then sends the buyer to the link's redirect_url. Never used in
// builds deployed to Vercel: the API override only accepts localhost there off Vercel.
import { createHmac } from "node:crypto";
import { createServer } from "node:http";

const port = Number(process.env.MOCK_SQUARE_PORT ?? 3297);
const signatureKey = process.env.MOCK_SQUARE_SIGNATURE_KEY ?? "e2e-square-signature-key";
const webhookUrl = process.env.MOCK_SQUARE_WEBHOOK_URL ?? "http://localhost:3202/api/square/webhook";
const locationId = process.env.MOCK_SQUARE_LOCATION_ID ?? "LOC-E2E";

let n = 0;
const links = new Map(); // idempotency key -> link
const orders = new Map(); // order id -> { amount, redirect, payments: [] }
const payments = new Map(); // payment id -> payment

const json = (res, status, body) => {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
};
const read = (req) => new Promise((resolve) => {
  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", () => resolve(body));
});

createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${port}`);
  if (req.method === "GET" && url.pathname === "/") return res.end("ok");
  if (req.method === "GET" && url.pathname === "/links") return json(res, 200, [...links.values()]);

  if (req.method === "POST" && url.pathname === "/v2/online-checkout/payment-links") {
    const body = JSON.parse(await read(req));
    const key = body.idempotency_key;
    if (!links.has(key)) {
      const i = ++n;
      const orderId = `ORDER-E2E-${i}`;
      links.set(key, { id: `LINK-E2E-${i}`, order_id: orderId, url: `http://localhost:${port}/checkout/${orderId}`, body });
      orders.set(orderId, { amount: body.quick_pay.price_money.amount, name: body.quick_pay.name, redirect: body.checkout_options?.redirect_url ?? null, payments: [] });
    }
    const { id, order_id, url: linkUrl } = links.get(key);
    return json(res, 200, { payment_link: { id, order_id, url: linkUrl } });
  }

  const checkout = url.pathname.match(/^\/checkout\/([A-Z0-9-]+)$/);
  if (checkout && orders.has(checkout[1])) {
    const order = orders.get(checkout[1]);
    if (req.method === "GET") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      return res.end(`<!doctype html><title>Square test checkout</title><h1>${order.name}</h1><p>£${(order.amount / 100).toFixed(2)}</p><form method="post"><button>Pay £${(order.amount / 100).toFixed(2)}</button></form>`);
    }
    // Pay: record the payment, tell the site (signed, as Square does), send the buyer back.
    const paymentId = `PAY-E2E-${++n}`;
    payments.set(paymentId, { id: paymentId, status: "COMPLETED", order_id: checkout[1], location_id: locationId, total_money: { amount: order.amount, currency: "GBP" }, created_at: new Date().toISOString() });
    order.payments.push(paymentId);
    const raw = JSON.stringify({ merchant_id: "ML-E2E", type: "payment.updated", event_id: `evt-e2e-${n}`, created_at: new Date().toISOString(), data: { type: "payment", id: paymentId, object: {} } });
    const signature = createHmac("sha256", signatureKey).update(webhookUrl + raw).digest("base64");
    await fetch(webhookUrl, { method: "POST", headers: { "Content-Type": "application/json", "x-square-hmacsha256-signature": signature }, body: raw });
    res.writeHead(303, { Location: order.redirect ?? "/" });
    return res.end();
  }

  const payment = url.pathname.match(/^\/v2\/payments\/([A-Za-z0-9-]+)$/);
  if (req.method === "GET" && payment) return payments.has(payment[1]) ? json(res, 200, { payment: payments.get(payment[1]) }) : json(res, 404, { errors: [] });
  const order = url.pathname.match(/^\/v2\/orders\/([A-Za-z0-9-]+)$/);
  if (req.method === "GET" && order) return json(res, 200, { order: { id: order[1], tenders: (orders.get(order[1])?.payments ?? []).map((p) => ({ payment_id: p })) } });
  json(res, 404, { errors: [{ code: "NOT_FOUND" }] });
}).listen(port, () => console.log(`Mock Square on ${port}`));
