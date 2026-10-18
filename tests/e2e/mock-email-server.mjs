// Stand-in for Resend's POST /emails during e2e tests. Never used in builds
// deployed to Vercel: the endpoint override only accepts https or localhost.
import { createServer } from "node:http";

const port = Number(process.env.MOCK_EMAIL_PORT ?? 3299);
const received = [];
// Attempts the mock refused (outage), for checking retries.
const refused = [];
// Like Resend: a repeated idempotency key it already accepted is answered but not sent again.
const acceptedKeys = new Set();

createServer((req, res) => {
  if (req.method === "GET" && req.url === "/requests") {
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify(received));
  }
  if (req.method === "GET" && req.url === "/refused") {
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify(refused));
  }
  if (req.method === "GET" && req.url === "/") {
    res.writeHead(200);
    return res.end("ok");
  }
  if (req.method === "POST" && req.url === "/emails") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      const payload = JSON.parse(body);
      // A name containing FAIL-TEST simulates a provider outage.
      if (payload.subject?.includes("FAIL-TEST")) {
        res.writeHead(500, { "Content-Type": "application/json" });
        return res.end('{"message":"simulated failure"}');
      }
      // EMAIL-DOWN: the email provider is down while the database is fine.
      if (payload.subject?.includes("EMAIL-DOWN")) {
        refused.push({ idempotencyKey: req.headers["idempotency-key"], subject: payload.subject });
        res.writeHead(503, { "Content-Type": "application/json" });
        return res.end('{"message":"simulated outage"}');
      }
      const key = req.headers["idempotency-key"];
      if (key && acceptedKeys.has(key)) {
        res.writeHead(200, { "Content-Type": "application/json" });
        return res.end('{"id":"test-email"}');
      }
      if (key) acceptedKeys.add(key);
      received.push({ headers: { authorization: req.headers.authorization, idempotencyKey: req.headers["idempotency-key"] }, payload });
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end('{"id":"test-email"}');
    });
    return;
  }
  res.writeHead(404);
  res.end();
}).listen(port, () => console.log(`mock email server on ${port}`));
