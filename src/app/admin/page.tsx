import Link from "next/link";
import { db } from "@/db";
import { sql } from "drizzle-orm";
import { STREAMS, kes } from "@/lib/constants";
import { golferCounts } from "@/lib/queries";

export const dynamic = "force-dynamic";

type Row = Record<string, unknown>;

async function streamTotals(from: Date, to: Date) {
  const out: Record<string, number> = {};
  const add = (k: string, v: number) => (out[k] = (out[k] || 0) + v);
  const lines = await db.execute<{ stream: string; total: number }>(sql`
    select ol.stream, sum(ol.total)::int as total from order_lines ol join orders o on o.id = ol.order_id
    where o.status = 'paid' and o.paid_at >= ${from.toISOString()}::timestamptz and o.paid_at < ${to.toISOString()}::timestamptz group by ol.stream`);
  lines.rows.forEach((r) => add(r.stream, r.total));
  const man = await db.execute<{ stream: string; total: number }>(sql`
    select stream, sum(amount)::int as total from manual_income
    where received_at >= ${from.toISOString()}::timestamptz and received_at < ${to.toISOString()}::timestamptz group by stream`);
  man.rows.forEach((r) => add(r.stream, r.total));
  const sp = await db.execute<{ total: number }>(sql`
    select coalesce(sum(value),0)::int as total from sponsorships
    where contract_start >= ${from.toISOString()}::timestamptz and contract_start < ${to.toISOString()}::timestamptz`);
  add("sponsorship", sp.rows[0]?.total || 0);
  return out;
}

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const sp = await searchParams;
  const days = sp.days === "all" ? 0 : [7, 30, 90].includes(Number(sp.days)) ? Number(sp.days) : 30;
  const now = new Date(Date.now() + 60_000);
  const from = days ? new Date(now.getTime() - days * 86400000) : new Date(0);
  const prevFrom = days ? new Date(from.getTime() - days * 86400000) : new Date(0);

  const [cur, prev, golfers] = await Promise.all([streamTotals(from, now), days ? streamTotals(prevFrom, from) : Promise.resolve({} as Record<string, number>), golferCounts()]);
  const sum = (o: Record<string, number>) => Object.values(o).reduce((a, b) => a + b, 0);
  const total = sum(cur);
  const prevTotal = sum(prev);
  const delta = prevTotal ? ((total - prevTotal) / prevTotal) * 100 : null;
  const max = Math.max(1, ...Object.keys(STREAMS).map((k) => cur[k] || 0));

  const byEvent = await db.execute<Row>(sql`
    select e.id, e.name,
      coalesce(sum(ol.total) filter (where ol.stream in ('events','tickets')),0)::int as entries,
      coalesce(sum(ol.total) filter (where ol.stream = 'rooms'),0)::int as rooms,
      coalesce(sum(ol.total) filter (where ol.stream = 'meals'),0)::int as meals,
      coalesce(sum(ol.total) filter (where ol.stream = 'carwash'),0)::int as carwash,
      coalesce(sum(ol.total) filter (where ol.stream = 'merchandise'),0)::int as merch,
      coalesce(sum(ol.total),0)::int as total,
      count(distinct o.id)::int as orders,
      count(distinct o.id) filter (where ol.stream not in ('events','tickets'))::int as addon_orders
    from order_lines ol join orders o on o.id = ol.order_id join events e on e.id = ol.event_id
    where o.status = 'paid' and o.paid_at >= ${from.toISOString()}::timestamptz and o.paid_at < ${now.toISOString()}::timestamptz
    group by e.id, e.name order by total desc`);

  const daily = await db.execute<{ d: string; total: number }>(sql`
    select to_char((o.paid_at at time zone 'Africa/Nairobi')::date, 'MM-DD') as d, sum(o.total)::int as total
    from orders o where o.status = 'paid' and o.paid_at >= ${new Date(Math.max(from.getTime(), now.getTime() - 30 * 86400000)).toISOString()}::timestamptz
    group by 1 order by 1`);
  const dmax = Math.max(1, ...daily.rows.map((r) => r.total));

  const [ops] = (await db.execute<Row>(sql`
    select
     (select count(*) from bookings where kind='table' and status='confirmed' and date >= to_char(now() at time zone 'Africa/Nairobi','YYYY-MM-DD'))::int as tables,
     (select coalesce(sum(guests),0) from bookings where kind='table' and status='confirmed' and date >= to_char(now() at time zone 'Africa/Nairobi','YYYY-MM-DD'))::int as covers,
     (select count(*) from bookings where kind='carwash' and status in ('confirmed','completed') and created_at >= ${from.toISOString()}::timestamptz)::int as washes,
     (select count(*) from leads where status in ('new','contacted'))::int as open_leads,
     (select count(*) from memberships where status='active' and renewal_due < now() + interval '30 days')::int as renewals_due,
     (select count(*) from memberships where status='lapsed')::int as lapsed,
     (select count(*) from memberships where status in ('received','under_review','approved'))::int as pending_members,
     (select coalesce(sum(qty * (end_date::date - date::date)),0) from bookings where kind='room' and status in ('confirmed','completed') and date >= to_char(now() at time zone 'Africa/Nairobi','YYYY-MM-DD') and date < to_char((now() + interval '30 days') at time zone 'Africa/Nairobi','YYYY-MM-DD'))::int as room_nights,
     (select coalesce(sum(total_rooms),0) from room_types)::int as room_stock,
     (select coalesce(sum(balance),0) from orders where status='paid')::int as balances,
     (select count(*) from payments where status='success' and reconciled_at is null)::int as unreconciled
  `)).rows;
  const top = await db.execute<{ item: string; qty: number; rev: number }>(sql`
    select regexp_replace(ol.item_name, ' \\(.*$', '') as item, sum(ol.qty)::int as qty, sum(ol.total)::int as rev
    from order_lines ol join orders o on o.id=ol.order_id where o.status='paid' and ol.kind='product' and ol.stream='merchandise'
    group by 1 order by qty desc limit 5`);
  const occ = Number(ops.room_stock) ? Math.round((Number(ops.room_nights) / (Number(ops.room_stock) * 30)) * 100) : 0;

  const Stat = ({ label, value, sub }: { label: string; value: string | number; sub?: string }) => (
    <div className="card !p-4"><p className="text-xs font-semibold uppercase tracking-wide text-fairway-800/70">{label}</p><p className="font-serif text-2xl font-bold text-fairway-900">{value}</p>{sub && <p className="text-xs text-fairway-800/60">{sub}</p>}</div>
  );

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-fairway-900">Revenue dashboard</h1>
        <div className="flex gap-1" role="tablist">
          {[["7", "7 days"], ["30", "30 days"], ["90", "90 days"], ["all", "All time"]].map(([k, l]) => (
            <Link key={k} href={`/admin?days=${k}`} className={`flex min-h-11 items-center rounded-lg px-3 text-sm font-semibold ${(days === 0 ? "all" : String(days)) === k ? "bg-fairway-800 text-white" : "bg-white border border-fairway-200"}`}>{l}</Link>
          ))}
        </div>
      </div>

      <div className="rounded-3xl bg-gradient-to-br from-fairway-800 to-fairway-600 p-6 text-white">
        <p className="text-sm uppercase tracking-widest text-gold-300">Total website-driven revenue</p>
        <p className="font-serif text-5xl font-bold">{kes(total)}</p>
        <p className="mt-1 text-fairway-100">{days ? (delta == null ? "No earlier period to compare" : `${delta >= 0 ? "▲" : "▼"} ${Math.abs(delta).toFixed(0)}% vs previous ${days} days (${kes(prevTotal)})`) : "All time"} · includes sponsorship & venue income recorded manually</p>
      </div>

      <section className="card">
        <h2 className="mb-3 text-lg font-bold">Revenue by stream</h2>
        <div className="grid gap-2">
          {Object.entries(STREAMS).map(([k, l]) => (
            <div key={k} className="grid grid-cols-[8rem_1fr_6rem] items-center gap-2 text-sm sm:grid-cols-[12rem_1fr_7rem]">
              <span className="truncate">{l}</span>
              <div className="h-4 overflow-hidden rounded-full bg-fairway-100"><div className="h-full bg-gold-500" style={{ width: `${((cur[k] || 0) / max) * 100}%` }} /></div>
              <span className="text-right font-semibold">{kes(cur[k] || 0)}</span>
            </div>
          ))}
        </div>
      </section>

      {daily.rows.length > 0 && (
        <section className="card">
          <h2 className="mb-3 text-lg font-bold">Daily revenue (last 30 days)</h2>
          <div className="flex h-32 items-end gap-1" role="img" aria-label="Daily revenue bar chart">
            {daily.rows.map((r) => <div key={r.d} title={`${r.d}: ${kes(r.total)}`} className="flex-1 rounded-t bg-fairway-600" style={{ height: `${Math.max(4, (r.total / dmax) * 100)}%` }} />)}
          </div>
        </section>
      )}

      <section className="card overflow-x-auto">
        <h2 className="mb-3 text-lg font-bold">Revenue by event</h2>
        {byEvent.rows.length === 0 ? <p className="text-sm text-fairway-800/70">No event-linked sales in this period yet.</p> : (
          <table className="w-full min-w-[44rem] text-left text-sm">
            <thead><tr className="border-b border-fairway-200 text-xs uppercase text-fairway-800/70"><th className="py-2">Event</th><th>Entries + tickets</th><th>Rooms</th><th>Meals</th><th>Car wash</th><th>Merch</th><th>Total</th><th>Golfers</th><th>Per golfer</th><th>Add-on rate</th></tr></thead>
            <tbody>
              {byEvent.rows.map((r) => {
                const g = golfers.get(Number(r.id)) || 0;
                return (
                  <tr key={String(r.id)} className="border-b border-fairway-100">
                    <td className="py-2 font-semibold">{String(r.name)}</td><td>{kes(Number(r.entries))}</td><td>{kes(Number(r.rooms))}</td><td>{kes(Number(r.meals))}</td><td>{kes(Number(r.carwash))}</td><td>{kes(Number(r.merch))}</td>
                    <td className="font-bold">{kes(Number(r.total))}</td><td>{g}</td><td>{g ? kes(Number(r.total) / g) : "–"}</td><td>{Number(r.orders) ? Math.round((Number(r.addon_orders) / Number(r.orders)) * 100) : 0}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold">Operations</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat label="Room occupancy (next 30d)" value={`${occ}%`} sub={`${ops.room_nights} nights of ${Number(ops.room_stock) * 30}`} />
          <Stat label="Table covers booked" value={String(ops.covers)} sub={`${ops.tables} reservations from today`} />
          <Stat label="Car washes booked" value={String(ops.washes)} sub="in selected period" />
          <Stat label="Open leads" value={String(ops.open_leads)} />
          <Stat label="Renewals due (30d)" value={String(ops.renewals_due)} sub={`${ops.lapsed} lapsed`} />
          <Stat label="Applications pending" value={String(ops.pending_members)} />
          <Stat label="Room balances due" value={kes(Number(ops.balances))} sub="collect at check-in" />
          <Stat label="Unreconciled M-Pesa" value={String(ops.unreconciled)} sub="see Orders & payments" />
        </div>
        <div className="card mt-3"><h3 className="mb-2 font-bold">Shop top sellers</h3>
          {top.rows.length === 0 ? <p className="text-sm text-fairway-800/70">No merchandise sold yet.</p> : <ul className="text-sm">{top.rows.map((t) => <li key={t.item} className="flex justify-between border-b border-fairway-100 py-1.5"><span>{t.item}</span><span>{t.qty} sold · {kes(t.rev)}</span></li>)}</ul>}
        </div>
      </section>
    </div>
  );
}
