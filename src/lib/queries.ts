import { db } from "@/db";
import { sql } from "drizzle-orm";
import * as s from "@/db/schema";
import { TZ } from "./constants";

export const nairobiDate = (d: Date | string) => new Date(d).toLocaleDateString("en-CA", { timeZone: TZ });

export function plusDay(d: string, n = 1) {
  const x = new Date(d + "T00:00:00Z");
  x.setUTCDate(x.getUTCDate() + n);
  return x.toISOString().slice(0, 10);
}

export async function golferCounts() {
  const r = await db.execute<{ event_id: number; golfers: number }>(sql`
    select r.event_id, coalesce(sum(jsonb_array_length(r.players)),0)::int as golfers
    from registrations r join entry_types e on e.id = r.entry_type_id
    where e.kind = 'entry' group by r.event_id`);
  const m = new Map<number, number>();
  for (const row of r.rows) m.set(row.event_id, row.golfers);
  return m;
}

export async function entryMinPrices() {
  const r = await db.execute<{ event_id: number; min: number }>(sql`
    select event_id, min(price)::int as min from entry_types where kind = 'entry' group by event_id`);
  const m = new Map<number, number>();
  for (const row of r.rows) m.set(row.event_id, row.min);
  return m;
}

export type EventRow = typeof s.events.$inferSelect;
