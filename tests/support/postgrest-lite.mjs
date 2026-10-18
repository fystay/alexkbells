// A small stand-in for Supabase's PostgREST API on an in-process Postgres
// (PGlite), for tests only. It runs the real migrations, so tables,
// constraints, triggers and functions behave exactly as in Supabase; only the
// HTTP layer is imitated, and only the parts the site uses:
//   GET/POST/PATCH/DELETE /rest/v1/<table or view>   POST /rest/v1/rpc/<function>
//   filters eq neq gt gte lt lte like ilike in is (and not.<op>), or=(…),
//   select (columns, no embedding), order, limit, offset, on_conflict,
//   Prefer: return=representation|minimal, resolution=ignore-duplicates|merge-duplicates.
// Responses are built by Postgres's own JSON functions, as PostgREST does.
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const MIGRATIONS = fileURLToPath(new URL("../../supabase/migrations/", import.meta.url));
const IDENT = /^[a-z_][a-z0-9_]*$/;

/** A fresh database with Supabase's roles and default grants, then every migration in order. */
export async function createTestDatabase() {
  const db = await PGlite.create();
  await db.exec(`
    create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
    grant usage on schema public to anon, authenticated, service_role;
    alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
    alter default privileges in schema public grant all on functions to anon, authenticated, service_role;
    alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
  `);
  for (const file of readdirSync(MIGRATIONS).filter((f) => f.endsWith(".sql")).sort()) {
    await db.exec(readFileSync(MIGRATIONS + file, "utf8"));
  }
  return db;
}

class HttpError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

const STATUS_BY_SQLSTATE = {
  23505: 409, 23503: 409, "23P01": 409,
  23502: 400, 23514: 400, P0001: 400, "22P02": 400, 22007: 400, 22008: 400, 22003: 400, 22023: 400, 22004: 400,
  42501: 403, 42883: 404, "42P01": 404,
};

function ident(name) {
  if (!IDENT.test(name)) throw new HttpError(400, "PGRST100", `Invalid identifier: ${name}`);
  return `"${name}"`;
}

/** Splits on commas outside parentheses and double quotes. */
function splitTop(text) {
  const parts = [];
  let depth = 0;
  let quoted = false;
  let current = "";
  for (const ch of text) {
    if (ch === '"') quoted = !quoted;
    if (!quoted && ch === "(") depth++;
    if (!quoted && ch === ")") depth--;
    if (!quoted && depth === 0 && ch === ",") {
      parts.push(current);
      current = "";
    } else current += ch;
  }
  if (current) parts.push(current);
  return parts;
}

const unquote = (v) => (v.startsWith('"') && v.endsWith('"') ? v.slice(1, -1) : v);

/** One condition, e.g. column "status", expression "in.(new,awaiting)". */
function condition(column, expression, params) {
  let negate = false;
  let expr = expression;
  if (expr.startsWith("not.")) {
    negate = true;
    expr = expr.slice(4);
  }
  const dot = expr.indexOf(".");
  if (dot < 0) throw new HttpError(400, "PGRST100", `Bad filter: ${expression}`);
  const op = expr.slice(0, dot);
  const value = expr.slice(dot + 1);
  const col = ident(column);
  const bind = (v) => {
    params.push(v);
    return `$${params.length}`;
  };
  let sql;
  switch (op) {
    case "eq": sql = `${col} = ${bind(value)}`; break;
    case "neq": sql = `${col} <> ${bind(value)}`; break;
    case "gt": sql = `${col} > ${bind(value)}`; break;
    case "gte": sql = `${col} >= ${bind(value)}`; break;
    case "lt": sql = `${col} < ${bind(value)}`; break;
    case "lte": sql = `${col} <= ${bind(value)}`; break;
    case "like": sql = `${col}::text like ${bind(value.replaceAll("*", "%"))}`; break;
    case "ilike": sql = `${col}::text ilike ${bind(value.replaceAll("*", "%"))}`; break;
    case "is": {
      const v = { null: "null", true: "true", false: "false" }[value];
      if (!v) throw new HttpError(400, "PGRST100", `Bad is filter: ${value}`);
      sql = `${col} is ${v}`;
      break;
    }
    case "in": {
      if (!value.startsWith("(") || !value.endsWith(")")) throw new HttpError(400, "PGRST100", "Bad in filter");
      const items = splitTop(value.slice(1, -1)).map(unquote);
      sql = items.length ? `${col} in (${items.map(bind).join(", ")})` : "false";
      break;
    }
    default:
      throw new HttpError(400, "PGRST100", `Unsupported operator: ${op}`);
  }
  return negate ? `not (${sql})` : sql;
}

const RESERVED = new Set(["select", "order", "limit", "offset", "on_conflict", "columns"]);

function whereClause(search, params) {
  const parts = [];
  for (const [key, value] of search) {
    if (RESERVED.has(key)) continue;
    if (key === "or") {
      if (!value.startsWith("(") || !value.endsWith(")")) throw new HttpError(400, "PGRST100", "Bad or filter");
      const alternatives = splitTop(value.slice(1, -1)).map((part) => {
        const dot = part.indexOf(".");
        return condition(part.slice(0, dot), part.slice(dot + 1), params);
      });
      parts.push(`(${alternatives.join(" or ")})`);
      continue;
    }
    parts.push(condition(key, value, params));
  }
  return parts.length ? ` where ${parts.join(" and ")}` : "";
}

function selectList(search) {
  const select = search.get("select") ?? "*";
  if (select === "*") return "*";
  return select.split(",").map((c) => ident(c.trim())).join(", ");
}

function orderClause(search) {
  const order = search.get("order");
  if (!order) return "";
  const terms = order.split(",").map((term) => {
    const [column, ...mods] = term.split(".");
    let sql = ident(column);
    for (const mod of mods) {
      const m = { asc: "asc", desc: "desc", nullsfirst: "nulls first", nullslast: "nulls last" }[mod];
      if (!m) throw new HttpError(400, "PGRST100", `Bad order: ${term}`);
      sql += ` ${m}`;
    }
    return sql;
  });
  return ` order by ${terms.join(", ")}`;
}

function limitClause(search) {
  let sql = "";
  for (const key of ["limit", "offset"]) {
    const v = search.get(key);
    if (v === null) continue;
    if (!/^\d+$/.test(v)) throw new HttpError(400, "PGRST100", `Bad ${key}`);
    sql += ` ${key} ${v}`;
  }
  return sql;
}

function preferences(headers) {
  const prefer = String(headers.prefer ?? headers.Prefer ?? "");
  return {
    representation: prefer.includes("return=representation"),
    ignoreDuplicates: prefer.includes("resolution=ignore-duplicates"),
    mergeDuplicates: prefer.includes("resolution=merge-duplicates"),
  };
}

/**
 * Returns `handle({ method, path, search, headers, body })` → `{ status, body }`
 * (body is a JS value or null). Requests run one at a time, each in a
 * transaction, as PostgREST runs each request in its own transaction.
 */
export function createPostgrest(db) {
  let queue = Promise.resolve();
  let relations = null;

  async function relationExists(tx, name) {
    if (!relations || !relations.has(name)) {
      const { rows } = await tx.query(
        "select table_name as name from information_schema.tables where table_schema = 'public'",
      );
      relations = new Set(rows.map((r) => r.name));
    }
    return relations.has(name);
  }

  async function run(tx, { method, path, search, headers, body }) {
    const prefer = preferences(headers);
    const rpc = path.match(/^\/rest\/v1\/rpc\/([a-z0-9_]+)$/);
    if (rpc) {
      if (method !== "POST") throw new HttpError(405, "PGRST117", "Use POST");
      const name = rpc[1];
      const { rows: procs } = await tx.query(
        `select p.prorettype::regtype::text as returns, coalesce(p.proargnames, '{}') as args
         from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = $1`,
        [name],
      );
      if (procs.length !== 1) throw new HttpError(404, "PGRST202", `Could not find the function public.${name}`);
      const args = body && typeof body === "object" ? body : {};
      const params = [];
      const named = Object.entries(args).map(([key, value]) => {
        if (!procs[0].args.includes(key)) throw new HttpError(404, "PGRST202", `No argument ${key} on ${name}`);
        params.push(value === null || value === undefined ? null : typeof value === "object" ? JSON.stringify(value) : String(value));
        return `${ident(key)} => $${params.length}`;
      });
      const call = `public.${ident(name)}(${named.join(", ")})`;
      if (procs[0].returns === "void") {
        await tx.query(`select ${call}`, params);
        return { status: 204, body: null };
      }
      const { rows } = await tx.query(`select to_jsonb(${call}) as result`, params);
      return { status: 200, body: rows[0].result };
    }

    const match = path.match(/^\/rest\/v1\/([a-z0-9_]+)$/);
    if (!match) throw new HttpError(404, "PGRST125", "Invalid path");
    const table = match[1];
    if (!(await relationExists(tx, table))) {
      throw new HttpError(404, "PGRST205", `Could not find the table 'public.${table}' in the schema cache`);
    }
    const target = `public.${ident(table)}`;
    const params = [];

    if (method === "GET") {
      const sql = `select coalesce(json_agg(t), '[]'::json) as rows from (select ${selectList(search)} from ${target}${whereClause(search, params)}${orderClause(search)}${limitClause(search)}) t`;
      const { rows } = await tx.query(sql, params);
      return { status: 200, body: rows[0].rows };
    }

    if (method === "POST") {
      const records = Array.isArray(body) ? body : [body];
      if (records.length === 0) return { status: 201, body: prefer.representation ? [] : null };
      const columns = Object.keys(records[0]).map(ident);
      params.push(JSON.stringify(records));
      let conflict = "";
      const onConflict = search.get("on_conflict");
      if (onConflict && (prefer.ignoreDuplicates || prefer.mergeDuplicates)) {
        const keys = onConflict.split(",").map(ident).join(", ");
        conflict = prefer.ignoreDuplicates
          ? ` on conflict (${keys}) do nothing`
          : ` on conflict (${keys}) do update set ${columns.map((c) => `${c} = excluded.${c}`).join(", ")}`;
      }
      const sql = `with ins as (insert into ${target} (${columns.join(", ")}) select ${columns.join(", ")} from json_populate_recordset(null::${target}, $1::json)${conflict} returning *) select coalesce(json_agg(ins), '[]'::json) as rows from ins`;
      const { rows } = await tx.query(sql, params);
      return { status: 201, body: prefer.representation ? rows[0].rows : null };
    }

    if (method === "PATCH") {
      if (!body || typeof body !== "object" || Array.isArray(body)) throw new HttpError(400, "PGRST102", "Bad body");
      const columns = Object.keys(body).map(ident);
      params.push(JSON.stringify(body));
      const where = whereClause(search, params);
      const sql = `with upd as (update ${target} set (${columns.join(", ")}) = (select ${columns.join(", ")} from json_populate_record(null::${target}, $1::json))${where} returning *) select coalesce(json_agg(upd), '[]'::json) as rows from upd`;
      // A one-column row constructor needs ROW(); Postgres requires it for single columns.
      const fixed = columns.length === 1 ? sql.replace(`set (${columns[0]}) = (select`, `set ${columns[0]} = (select`) : sql;
      const { rows } = await tx.query(fixed, params);
      return { status: prefer.representation ? 200 : 204, body: prefer.representation ? rows[0].rows : null };
    }

    if (method === "DELETE") {
      const where = whereClause(search, params);
      const sql = `with del as (delete from ${target}${where} returning *) select coalesce(json_agg(del), '[]'::json) as rows from del`;
      const { rows } = await tx.query(sql, params);
      return { status: prefer.representation ? 200 : 204, body: prefer.representation ? rows[0].rows : null };
    }

    throw new HttpError(405, "PGRST117", "Unsupported method");
  }

  return function handle(request) {
    const result = queue.then(async () => {
      try {
        return await db.transaction((tx) => run(tx, request));
      } catch (error) {
        if (error instanceof HttpError) {
          return { status: error.status, body: { code: error.code, message: error.message, details: null, hint: null } };
        }
        const code = error?.code ?? "XX000";
        return {
          status: STATUS_BY_SQLSTATE[code] ?? 500,
          body: { code, message: String(error?.message ?? error), details: error?.detail ?? null, hint: error?.hint ?? null },
        };
      }
    });
    queue = result.catch(() => {});
    return result;
  };
}

/** A fetch() that answers /rest/v1 requests from `handle`, for unit tests without a server. */
export function postgrestFetch(handle) {
  return async (input, init = {}) => {
    const url = new URL(typeof input === "string" ? input : input.url);
    const headers = Object.fromEntries(Object.entries(init.headers ?? {}).map(([k, v]) => [k.toLowerCase(), v]));
    const body = typeof init.body === "string" && init.body ? JSON.parse(init.body) : null;
    const result = await handle({ method: init.method ?? "GET", path: url.pathname, search: url.searchParams, headers, body });
    return new Response(result.body === null ? null : JSON.stringify(result.body), {
      status: result.status,
      headers: { "Content-Type": "application/json" },
    });
  };
}
