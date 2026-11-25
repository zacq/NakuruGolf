import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/db";
import { asc, eq } from "drizzle-orm";
import * as s from "@/db/schema";
import { CLUB, fmtDateTime, kes, waLink } from "@/lib/constants";
import { QrSvg } from "@/components/QrSvg";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your booking confirmation", robots: { index: false } };

export default async function OrderPage({ params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  const [o] = await db.select().from(s.orders).where(eq(s.orders.number, number));
  if (!o) notFound();
  const [lines, regs, bks, pay, events] = await Promise.all([
    db.select().from(s.orderLines).where(eq(s.orderLines.orderId, o.id)).orderBy(asc(s.orderLines.id)),
    db.select().from(s.registrations).where(eq(s.registrations.orderId, o.id)),
    db.select().from(s.bookings).where(eq(s.bookings.orderId, o.id)),
    db.select().from(s.payments).where(eq(s.payments.orderId, o.id)),
    db.select().from(s.events),
  ]);
  const receipt = pay.find((p) => p.status === "success")?.mpesaReceipt;
  const paid = o.status === "paid";
  const waMsg = waLink(`Hello Nakuru Golf Club, my booking ${o.number} is confirmed${receipt ? ` (M-Pesa ${receipt})` : ""}. I have a question.`);
  const sponsor = (id: number) => events.find((e) => e.id === id)?.titleSponsor;
  const evName = (id: number) => events.find((e) => e.id === id)?.name || "Event";

  return (
    <div className="container-x section max-w-3xl">
      <div className={`rounded-3xl p-6 text-white ${paid ? "bg-fairway-800" : "bg-amber-700"}`}>
        <p className="text-sm uppercase tracking-widest text-gold-300">{paid ? "Payment received" : `Order ${o.status}`}</p>
        <h1 className="mt-1 text-3xl font-bold">{paid ? "You're booked! ⛳" : "Order not paid"}</h1>
        <p className="mt-1">Order <strong>{o.number}</strong>{receipt && <> · M-Pesa receipt <strong>{receipt}</strong></>}</p>
        <p className="text-sm text-fairway-100">{o.customerName} · {o.phone.slice(0, 6)}****{o.phone.slice(-2)} · {fmtDateTime(o.createdAt)}</p>
      </div>

      <div className="card mt-5">
        <h2 className="mb-2 text-xl font-bold">Receipt</h2>
        <ul className="divide-y divide-fairway-100">
          {lines.map((l) => <li key={l.id} className="flex justify-between gap-3 py-2 text-sm"><span>{l.itemName}{l.qty > 1 ? ` × ${l.qty}` : ""}</span><span className="shrink-0 font-semibold">{kes(l.total)}</span></li>)}
        </ul>
        {o.discount > 0 && <p className="mt-2 flex justify-between text-sm text-fairway-700"><span>Discount {o.promoCode}</span><span>−{kes(o.discount)}</span></p>}
        <p className="mt-2 flex justify-between border-t border-fairway-100 pt-2 font-bold"><span>Total</span><span>{kes(o.total)}</span></p>
        <p className="flex justify-between text-sm"><span>Paid now</span><span>{kes(o.amountDue)}</span></p>
        {o.balance > 0 && <p className="flex justify-between text-sm font-semibold text-red-700"><span>Balance due at check-in</span><span>{kes(o.balance)}</span></p>}
      </div>

      {paid && regs.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-1 text-xl font-bold">Your tickets</h2>
          <p className="mb-3 text-sm text-fairway-800/70">Show the QR code at check-in. This page works offline once loaded.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            {regs.map((r) => (
              <div key={r.id} className="card grid justify-items-center gap-2 text-center">
                <p className="text-xs font-bold uppercase tracking-widest text-gold-600">{evName(r.eventId)}</p>
                {sponsor(r.eventId) && <p className="text-xs">Sponsored by {sponsor(r.eventId)}</p>}
                <p className="font-serif text-lg font-bold">{r.holderName}</p>
                {Array.isArray(r.players) && r.players.length > 1 && <p className="text-xs">{r.players.map((p) => p.name).join(", ")}</p>}
                <QrSvg value={r.qrCode} />
                <p className="font-mono text-sm font-bold tracking-wider">{r.qrCode}</p>
                <p className={`chip ${r.checkedInAt ? "!bg-gold-400" : ""}`}>{r.checkedInAt ? "Checked in" : "Not yet checked in"}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {paid && bks.length > 0 && (
        <section className="mt-6 card">
          <h2 className="mb-2 text-xl font-bold">Your bookings</h2>
          <ul className="grid gap-2 text-sm">
            {bks.map((b) => (
              <li key={b.id} className="flex justify-between gap-3 rounded-lg bg-fairway-50 p-3">
                <span><strong className="capitalize">{b.kind === "teetime" ? "Tee time" : b.kind}</strong> · {b.label}<br />{b.date}{b.endDate ? ` → ${b.endDate}` : ""} {b.time}</span>
                <span className="chip h-fit capitalize">{b.status === "requested" ? "Awaiting staff confirmation" : b.status}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <a href={waMsg} target="_blank" rel="noopener" className="btn-wa">💬 Chat with us on WhatsApp</a>
        <Link href="/account" className="btn-outline">My account</Link>
        {!paid && <Link href="/cart" className="btn-primary sm:col-span-2">Back to cart</Link>}
      </div>
      <p className="mt-4 text-center text-xs text-fairway-800/60">Reception {CLUB.phoneDisplay} · {CLUB.email}</p>
    </div>
  );
}
