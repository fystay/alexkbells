// Stand-in for Supabase Auth (GoTrue) during e2e tests. Never used in builds
// deployed to Vercel: SUPABASE_URL only accepts http on localhost.
import { createServer } from "node:http";

const port = Number(process.env.MOCK_SUPABASE_PORT ?? 3298);
const coach = { email: "coach-e2e@example.com", password: "correct-horse" };
const sessions = new Set();
let issued = 0;

function json(res, status, body) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

function newSession() {
  issued += 1;
  const accessToken = `access-${issued}`;
  sessions.add(accessToken);
  return { access_token: accessToken, refresh_token: `refresh-${issued}`, expires_in: 3600, user: { email: coach.email } };
}

createServer((req, res) => {
  const url = new URL(req.url ?? "/", `http://localhost:${port}`);
  if (req.method === "GET" && url.pathname === "/") return json(res, 200, { ok: true });
  if (req.headers.apikey !== "sb_secret_e2e") return json(res, 401, { message: "Invalid API key" });

  if (req.method === "GET" && url.pathname === "/auth/v1/user") {
    const token = req.headers.authorization?.replace(/^Bearer /, "");
    return sessions.has(token) ? json(res, 200, { email: coach.email }) : json(res, 401, { message: "invalid JWT" });
  }
  if (req.method === "POST" && url.pathname === "/auth/v1/logout") {
    sessions.delete(req.headers.authorization?.replace(/^Bearer /, ""));
    res.writeHead(204);
    return res.end();
  }
  if (req.method === "POST" && url.pathname === "/auth/v1/token") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      const payload = JSON.parse(body);
      const grant = url.searchParams.get("grant_type");
      if (grant === "password" && payload.email === coach.email && payload.password === coach.password) {
        return json(res, 200, newSession());
      }
      if (grant === "refresh_token" && /^refresh-\d+$/.test(payload.refresh_token)) return json(res, 200, newSession());
      json(res, 400, { error: "invalid_grant", error_description: "Invalid login credentials" });
    });
    return;
  }
  json(res, 404, {});
}).listen(port, () => console.log(`mock supabase auth on ${port}`));
