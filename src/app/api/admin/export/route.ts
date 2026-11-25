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
  const type = new URL(req.url).searchParams.get("type") === "lines" ? "lines" : "payments";
  const q =
    type === "lines"
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
  return new Response(csv, { headers: { "Content-Type": "text/csv", "Content-Disposition": `attachment; filename="ngc-${type}.csv"` } });
}
