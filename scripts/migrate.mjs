// Applies migrations/*.sql in order, once each. Runs before `next build` on Netlify.
import "dotenv/config";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";

const { DATABASE_URL, CONTEXT } = process.env;
if (!DATABASE_URL) {
  console.warn("[migrate] DATABASE_URL is not set: skipped. The site needs it at runtime.");
  process.exit(0);
}
if (CONTEXT && CONTEXT !== "production") {
  console.log(`[migrate] skipped for the ${CONTEXT} context`);
  process.exit(0);
}

const dir = join(import.meta.dirname, "..", "migrations");
const client = new pg.Client({ connectionString: DATABASE_URL });
await client.connect();
try {
  await client.query("begin");
  await client.query("select pg_advisory_xact_lock(424241)");
  await client.query("create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())");
  const done = new Set((await client.query("select name from schema_migrations")).rows.map((r) => r.name));
  for (const f of readdirSync(dir).filter((x) => x.endsWith(".sql")).sort()) {
    if (done.has(f)) continue;
    await client.query(readFileSync(join(dir, f), "utf8"));
    await client.query("insert into schema_migrations (name) values ($1)", [f]);
    console.log(`[migrate] applied ${f}`);
  }
  await client.query("commit");
} catch (e) {
  await client.query("rollback");
  throw e;
} finally {
  await client.end();
}
