// Stand-in for Supabase Auth (GoTrue) and the database API (PostgREST) during
// e2e tests. The database is an in-process Postgres (PGlite) built from the
// real migrations (tests/support/postgrest-lite.mjs). Never used in builds
// deployed to Vercel: SUPABASE_URL only accepts http on localhost.
import { createServer } from "node:http";
import { createPostgrest, createTestDatabase } from "../support/postgrest-lite.mjs";

const port = Number(process.env.MOCK_SUPABASE_PORT ?? 3298);
const coach = { email: "coach-e2e@example.com", password: "correct-horse" };
const sessions = new Set();
let issued = 0;
const db = await createTestDatabase();
const postgrest = createPostgrest(db);

function readBody(req) {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => resolve(body));
  });
}

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
  // Test inspection only (no key): what the site stored.
  if (req.method === "GET" && url.pathname === "/stored") {
    db.query("select coalesce(json_agg(r order by created_at), '[]'::json) as rows from akb_booking_requests r").then(
      ({ rows }) => json(res, 200, rows[0].rows),
      (error) => json(res, 500, { message: String(error) }),
    );
    return;
  }
  // Test setup only (no key): run SQL against the stand-in database, e.g. to seed a request.
  if (req.method === "POST" && url.pathname === "/test/sql") {
    readBody(req).then(async (text) => {
      const { sql, params = [] } = JSON.parse(text);
      try {
        json(res, 200, (await db.query(sql, params)).rows);
      } catch (error) {
        json(res, 400, { message: String(error?.message ?? error) });
      }
    });
    return;
  }
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
  if (url.pathname.startsWith("/rest/v1/")) {
    readBody(req).then(async (text) => {
      const body = text ? JSON.parse(text) : null;
      // FAIL-TEST in a stored name or in a query simulates a database outage (as the email mock does).
      if (JSON.stringify(body ?? "").includes("FAIL-TEST") || decodeURIComponent(url.search).includes("FAIL-TEST")) {
        return json(res, 503, { message: "simulated failure" });
      }
      const result = await postgrest({ method: req.method, path: url.pathname, search: url.searchParams, headers: req.headers, body });
      if (result.body === null) {
        res.writeHead(result.status);
        return res.end();
      }
      json(res, result.status, result.body);
    });
    return;
  }
  json(res, 404, {});
}).listen(port, () => console.log(`mock supabase auth on ${port}`));
