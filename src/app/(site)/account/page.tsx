import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/db";
import { and, desc, eq, inArray } from "drizzle-orm";
import * as s from "@/db/schema";
import { fmtDate, kes } from "@/lib/constants";
import { getSessionPhone } from "@/lib/session";
import { AuthForm, ConsentToggle, LogoutButton, PayMembershipButton } from "@/components/AccountClient";
import { QrSvg } from "@/components/QrSvg";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "My account — bookings, tickets & membership", robots: { index: false } };

export default async function AccountPage() {
  const phone = await getSessionPhone();
  if (!phone)
    return (
      <div className="container-x section">
        <h1 className="mb-2 text-center text-3xl font-bold text-fairway-900">Sign in</h1>
        <p className="mx-auto mb-6 max-w-md text-center text-fairway-800/80">Enter your phone number and we'll text you a one-time code. See your bookings, QR tickets, receipts and membership.</p>
        <AuthForm />
      </div>
    );
  const [orders, regs, members, cats, events] = await Promise.all([
    db.select().from(s.orders).where(and(eq(s.orders.phone, phone), inArray(s.orders.status, ["paid", "refunded"]))).orderBy(desc(s.orders.createdAt)),
    db.select({ r: s.registrations, o: s.orders.phone }).from(s.registrations).innerJoin(s.orders, eq(s.orders.id, s.registrations.orderId)).where(eq(s.orders.phone, phone)),
    db.select().from(s.memberships).where(eq(s.memberships.phone, phone)),
    db.select().from(s.membershipCategories),
    db.select().from(s.events),
  ]);
  const [cust] = await db.select().from(s.customers).where(eq(s.customers.phone, phone));
  return (
    <div className="container-x section grid gap-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-3xl font-bold text-fairway-900">Hello{cust?.name ? `, ${cust.name.split(" ")[0]}` : ""}</h1><p className="text-fairway-800/70">+{phone}</p></div>
        <LogoutButton />
      </div>

      {members.length > 0 && (
        <section>
          <h2 className="mb-3 text-2xl font-bold">Membership</h2>
          <div className="grid gap-3">
            {members.map((m) => {
              const cat = cats.find((c) => c.id === m.categoryId);
              if (!cat) return null;
              const needsPay = m.status === "approved";
              const renew = m.status === "active" || m.status === "lapsed";
              const due = m.renewalDue ? new Date(m.renewalDue) : null;
              const soon = due && due.getTime() - Date.now() < 45 * 86400000;
              return (
                <div key={m.id} className="card flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-serif text-lg font-bold">{cat.name}</p>
                    <p className="chip capitalize">{m.status.replace("_", " ")}</p>
                    {due && <p className="mt-1 text-sm">Renewal due {fmtDate(due)}</p>}
                    {m.status === "active" && <p className="text-sm text-fairway-700">Member prices are applied while you are signed in.</p>}
                  </div>
                  {needsPay && <PayMembershipButton id={m.id} name={m.name} label={`Pay joining fee + subscription (${kes(cat.joiningFee + cat.annualFee)})`} price={cat.joiningFee + cat.annualFee} />}
                  {renew && (soon || m.status === "lapsed") && <PayMembershipButton id={m.id} name={m.name} label={`Renew (${kes(cat.annualFee)})`} price={cat.annualFee} />}
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 text-2xl font-bold">My tickets</h2>
        {regs.length === 0 ? <p className="text-fairway-800/70">No tickets yet. <Link href="/events" className="font-semibold underline">Browse events</Link>.</p> : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {regs.map(({ r }) => (
              <div key={r.id} className="card grid justify-items-center gap-1 text-center">
                <p className="text-xs font-bold uppercase text-gold-600">{events.find((e) => e.id === r.eventId)?.name}</p>
                <p className="font-bold">{r.holderName}</p>
                <QrSvg value={r.qrCode} size={150} />
                <p className="font-mono text-xs">{r.qrCode}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-2xl font-bold">Bookings & receipts</h2>
        <div className="grid gap-2">
          {orders.length === 0 && <p className="text-fairway-800/70">No paid orders yet.</p>}
          {orders.map((o) => (
            <Link key={o.id} href={`/orders/${o.number}`} className="card flex items-center justify-between !p-4 hover:shadow-md">
              <div><p className="font-bold">{o.number}</p><p className="text-sm text-fairway-800/70">{fmtDate(o.createdAt)} · <span className="capitalize">{o.status}</span></p></div>
              <p className="font-bold">{kes(o.total)}</p>
            </Link>
          ))}
        </div>
      </section>
      <ConsentToggle initial={cust?.marketingConsent ?? false} />
    </div>
  );
}
