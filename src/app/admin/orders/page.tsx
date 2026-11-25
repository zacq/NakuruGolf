import { db } from "@/db";
import { desc, eq } from "drizzle-orm";
import * as s from "@/db/schema";
import { fmtDateTime, kes } from "@/lib/constants";
import { markReconciled, refundOrder } from "../actions";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const [orders, pays] = await Promise.all([
    db.select().from(s.orders).orderBy(desc(s.orders.createdAt)).limit(100),
    db.select({ p: s.payments, number: s.orders.number, due: s.orders.amountDue }).from(s.payments).innerJoin(s.orders, eq(s.orders.id, s.payments.orderId)).orderBy(desc(s.payments.createdAt)).limit(100),
  ]);
  return (
    <div className="grid gap-8">
      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-2xl font-bold text-fairway-900">Payment reconciliation</h1>
          <div className="flex gap-2"><a className="btn-outline min-h-11 text-sm" href="/api/admin/export?type=payments">Export payments CSV</a><a className="btn-outline min-h-11 text-sm" href="/api/admin/export?type=lines">Export order lines CSV</a></div>
        </div>
        <div className="card overflow-x-auto !p-0">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="bg-fairway-800 text-white"><tr><th className="p-3">Order</th><th>M-Pesa receipt</th><th>Amount</th><th>Matches order?</th><th>Mode</th><th>Status</th><th>Reconciled</th></tr></thead>
            <tbody>
              {pays.map(({ p, number, due }) => (
                <tr key={p.id} className="border-t border-fairway-100">
                  <td className="p-3 font-semibold">{number}</td><td className="font-mono">{p.mpesaReceipt || "–"}</td><td>{kes(p.amount)}</td>
                  <td>{p.amount === due ? "✓ yes" : "✕ no"}</td><td>{p.mode}</td><td className="capitalize">{p.status}</td>
                  <td>{p.reconciledAt ? "✓ " + fmtDateTime(p.reconciledAt) : p.status === "success" ? <form action={markReconciled}><input type="hidden" name="id" value={p.id} /><button className="min-h-11 font-semibold underline">Mark reconciled</button></form> : "–"}</td>
                </tr>
              ))}
              {pays.length === 0 && <tr><td colSpan={7} className="p-4 text-fairway-800/70">No payments yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
      <section>
        <h2 className="mb-3 text-xl font-bold">Orders</h2>
        <div className="grid gap-2">
          {orders.map((o) => (
            <div key={o.id} className="card flex flex-wrap items-center justify-between gap-3 !p-4">
              <div><p className="font-bold"><a className="underline" href={`/orders/${o.number}`}>{o.number}</a> · {o.customerName}</p><p className="text-sm text-fairway-800/70">+{o.phone} · {fmtDateTime(o.createdAt)} · {o.source}{o.isMember ? " · member" : ""}{o.poRef ? ` · PO ${o.poRef}` : ""}</p>{o.refundReason && <p className="text-sm text-red-700">Refund: {o.refundReason}</p>}</div>
              <div className="flex items-center gap-3">
                <div className="text-right"><p className="font-bold">{kes(o.total)}</p><span className={`chip capitalize ${o.status === "paid" ? "" : "!bg-amber-100 !text-amber-900"}`}>{o.status}</span></div>
                {o.status === "paid" && (
                  <form action={refundOrder} className="flex gap-2"><input type="hidden" name="id" value={o.id} /><input name="reason" required placeholder="Refund reason" className="field !min-h-11 w-36" /><button className="btn-outline !min-h-11 px-3 text-sm">Refund</button></form>
                )}
              </div>
            </div>
          ))}
          {orders.length === 0 && <p className="text-fairway-800/70">No orders yet.</p>}
        </div>
      </section>
    </div>
  );
}
