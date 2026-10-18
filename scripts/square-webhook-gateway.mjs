// Local Square Sandbox testing only (DEPLOYMENT.md → Local Square Sandbox).
// The HTTPS tunnel points here, not at the site: only POST /api/square/webhook
// is passed on (raw body and Square's signature header unchanged), so the
// coach area, cron endpoints and everything else stay unreachable from the
// internet. Listens on 127.0.0.1 only. No dependencies.
//   node scripts/square-webhook-gateway.mjs            (gateway :3401 → site :3400)
//   GATEWAY_PORT=3401 SITE_URL=http://127.0.0.1:3400 node scripts/square-webhook-gateway.mjs
import { createServer } from "node:http";

const PATH = "/api/square/webhook";
const MAX_BYTES = 64 * 1024;
const port = Number(process.env.GATEWAY_PORT ?? 3401);
const site = new URL(process.env.SITE_URL ?? "http://127.0.0.1:3400");
if (!["127.0.0.1", "localhost"].includes(site.hostname)) throw new Error("SITE_URL must be a local address");

createServer((req, res) => {
  const reply = (status, body) => {
    res.writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store" });
    res.end(JSON.stringify(body));
  };
  if (req.method !== "POST" || req.url !== PATH) return reply(404, { error: "not-found" });
  const chunks = [];
  let size = 0;
  req.on("data", (chunk) => {
    size += chunk.length;
    if (size > MAX_BYTES) {
      reply(413, { error: "too-large" });
      req.destroy();
    } else chunks.push(chunk);
  });
  req.on("end", async () => {
    if (res.writableEnded) return;
    try {
      const upstream = await fetch(new URL(PATH, site), {
        method: "POST",
        headers: {
          "Content-Type": req.headers["content-type"] ?? "application/json",
          "x-square-hmacsha256-signature": String(req.headers["x-square-hmacsha256-signature"] ?? ""),
        },
        body: Buffer.concat(chunks),
        signal: AbortSignal.timeout(15_000),
      });
      res.writeHead(upstream.status, { "Content-Type": "application/json", "Cache-Control": "no-store" });
      res.end(await upstream.text());
      console.log(`${new Date().toISOString()} webhook → ${upstream.status}`);
    } catch {
      reply(502, { error: "site-unreachable" });
    }
  });
}).listen(port, "127.0.0.1", () => console.log(`Square webhook gateway on http://127.0.0.1:${port}${PATH} → ${site.origin}`));
