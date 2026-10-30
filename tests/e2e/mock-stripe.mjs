// Stand-in for Stripe during e2e tests: Checkout Sessions and a hosted
// "checkout" page. Paying on the page does what Stripe does: marks the session
// complete and paid, sends a signed checkout.session.completed webhook to the
// site, then sends the buyer to the session's success_url. Never used in builds
// deployed to Vercel: the API override only accepts localhost there off Vercel.
import { createHmac } from "node:crypto";
import { createServer } from "node:http";

const port = Number(process.env.MOCK_STRIPE_PORT ?? 3297);
const signingSecret = process.env.MOCK_STRIPE_WEBHOOK_SECRET ?? "whsec_e2e_not_real";
const webhookUrl = process.env.MOCK_STRIPE_WEBHOOK_URL ?? "http://localhost:3202/api/stripe/webhook";

let n = 0;
const byKey = new Map(); // idempotency key -> session id
const sessions = new Map(); // session id -> session

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
  if (req.method === "GET" && url.pathname === "/sessions") return json(res, 200, [...sessions.values()]);

  if (req.method === "POST" && url.pathname === "/v1/checkout/sessions") {
    const form = new URLSearchParams(await read(req));
    const key = req.headers["idempotency-key"];
    if (!key || !byKey.has(key)) {
      const id = `cs_test_e2e_${++n}`;
      sessions.set(id, {
        id,
        object: "checkout.session",
        mode: form.get("mode") ?? "payment",
        status: "open",
        payment_status: "unpaid",
        payment_intent: null,
        amount_total: Number(form.get("line_items[0][price_data][unit_amount]") ?? 0),
        currency: "gbp",
        created: Math.floor(Date.now() / 1000),
        url: `http://localhost:${port}/checkout/${id}`,
        name: form.get("line_items[0][price_data][product_data][name]") ?? "Payment",
        success_url: form.get("success_url") ?? "",
      });
      if (key) byKey.set(key, id);
    }
    return json(res, 200, sessions.get(key ? byKey.get(key) : `cs_test_e2e_${n}`));
  }

  const one = url.pathname.match(/^\/v1\/checkout\/sessions\/([\w-]+)$/);
  if (req.method === "GET" && one) return sessions.has(one[1]) ? json(res, 200, sessions.get(one[1])) : json(res, 404, { error: {} });
  if (req.method === "GET" && url.pathname === "/v1/checkout/sessions") return json(res, 200, { data: [...sessions.values()].filter((s) => s.payment_intent === url.searchParams.get("payment_intent")) });
  if (req.method === "GET" && url.pathname === "/v1/refunds") return json(res, 200, { data: [] });

  const checkout = url.pathname.match(/^\/checkout\/([\w-]+)$/);
  if (checkout && sessions.has(checkout[1])) {
    const session = sessions.get(checkout[1]);
    if (req.method === "GET") {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      return res.end(`<!doctype html><title>Stripe test checkout</title><h1>${session.name}</h1><p>£${(session.amount_total / 100).toFixed(2)}</p><form method="post"><button>Pay £${(session.amount_total / 100).toFixed(2)}</button></form>`);
    }
    // Pay: complete the session, tell the site (signed, as Stripe does), send the buyer back.
    session.status = "complete";
    session.payment_status = "paid";
    session.payment_intent = `pi_test_e2e_${++n}`;
    const raw = JSON.stringify({ id: `evt_e2e_${n}`, object: "event", type: "checkout.session.completed", created: Math.floor(Date.now() / 1000), data: { object: { id: session.id } } });
    const t = Math.floor(Date.now() / 1000);
    const signature = createHmac("sha256", signingSecret).update(`${t}.${raw}`).digest("hex");
    await fetch(webhookUrl, { method: "POST", headers: { "Content-Type": "application/json", "Stripe-Signature": `t=${t},v1=${signature}` }, body: raw });
    res.writeHead(303, { Location: session.success_url || "/" });
    return res.end();
  }

  json(res, 404, { error: { type: "invalid_request_error" } });
}).listen(port, () => console.log(`Mock Stripe on ${port}`));
