import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const globalForDb = globalThis as typeof globalThis & { __ngcPool?: Pool };

// The pool connects lazily, so `next build` works without a database.
function createPool() {
  const p = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
  });
  p.on("error", (e) => console.error("idle database client error", e.message));
  return p;
}

export const pool = (globalForDb.__ngcPool ??= createPool());

export const db = drizzle(pool);
export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];
export type Q = typeof db | Tx;
