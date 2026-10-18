// Tests only: a fresh Postgres (PGlite) with every migration applied, reached
// through the PostgREST stand-in, so data-layer tests run against the real
// schema, constraints and functions.
import { createPostgrest, createTestDatabase, postgrestFetch } from "../../../tests/support/postgrest-lite.mjs";
import type { Db } from "./db";

export async function testDb(): Promise<{
  db: Db;
  sql: (query: string, params?: unknown[]) => Promise<Record<string, unknown>[]>;
  /** Runs a whole SQL script (several statements), e.g. a migration file. */
  exec: (script: string) => Promise<void>;
}> {
  const pg = await createTestDatabase();
  const handle = createPostgrest(pg);
  const db: Db = { config: { url: "http://localhost:1", secretKey: "sb_secret_test" }, fetchImpl: postgrestFetch(handle) as typeof fetch };
  const sql = async (query: string, params: unknown[] = []) => (await pg.query(query, params)).rows as Record<string, unknown>[];
  const exec = async (script: string) => {
    await pg.exec(script);
  };
  return { db, sql, exec };
}
