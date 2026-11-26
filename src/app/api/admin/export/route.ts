import { db } from "@/db";
import { sql } from "drizzle-orm";
import { isAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";

const esc = (v: unknown) => {
  let t = v == null ? "" : v instanceof Date ? v.toISOString() : String(v);
  if (typeof v === "string" && /^[=+\-@\t\r]/.test(t)) t = `'${t}`; // spreadsheet formula injection
  return /[",\r\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
};

export async function GET(req: Request) {
  if (!(await isAdmin())) return new Response("Unauthorized", { status: 401 });
  const u = new URL(req.url);
  const type = ["lines", "startsheet"].includes(u.searchParams.get("type") || "") ? u.searchParams.get("type")! : "payments";
  const eventId = Number(u.searchParams.get("eventId")) || 0;
  // start sheet: drawn players per tee time, for entering the competition on HowDidiDo
  const q =
    type === "startsheet"
      ? sql`select to_char(t.starts_at at time zone 'Africa/Nairobi', 'YYYY-MM-DD') as date, to_char(t.starts_at at time zone 'Africa/Nairobi', 'HH24:MI') as tee_time,
              b.position as draw_position, b.result, b.name, b.handicap, b.hdid_id as howdidido_id, b.club, b.phone, b.mpesa_receipt
            from ballot_entries b join tee_times t on t.id = b.tee_time_id
            where b.event_id = ${eventId} order by t.starts_at, b.result desc, b.position nulls last, b.id`
      : type === "lines"
      ? sql`select o.number as order_number, o.paid_at, o.customer_name, o.phone, ol.stream, ol.item_name, ol.qty, ol.unit_price, ol.total, ol.balance, e.name as event
            from order_lines ol join orders o on o.id = ol.order_id left join events e on e.id = ol.event_id
            where o.status = 'paid' order by o.paid_at desc`
      : sql`select o.number as order_number, p.mpesa_receipt, p.phone as mpesa_phone, p.amount, o.amount_due as order_amount_due,
              (p.amount = o.amount_due) as matches_order, p.status, p.mode, p.created_at, p.reconciled_at
            from payments p join orders o on o.id = p.order_id order by p.created_at desc`;
  const r = await db.execute(q);
  const rows = r.rows as Record<string, unknown>[];
  const headers = rows[0] ? Object.keys(rows[0]) : [];
  const csv = [headers.join(","), ...rows.map((row) => headers.map((h) => esc(row[h])).join(","))].join("\n");
  return new Response(csv, { headers: { "Content-Type": "text/csv", "Content-Disposition": `attachment; filename="ngc-${type}${eventId ? "-" + eventId : ""}.csv"` } });
}
