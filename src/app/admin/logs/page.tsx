import { db } from "@/db";
import { desc, sql } from "drizzle-orm";
import * as s from "@/db/schema";
import { fmtDateTime, kes } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function LogsPage() {
  const [notes, audit, customers] = await Promise.all([
    db.select().from(s.notifications).orderBy(desc(s.notifications.createdAt)).limit(60),
    db.select().from(s.auditLogs).orderBy(desc(s.auditLogs.createdAt)).limit(60),
    db.select({ c: s.customers, spend: sql<number>`(select coalesce(sum(o.total),0)::int from orders o where o.phone = customers.phone and o.status = 'paid')`, events: sql<number>`(select count(distinct r.event_id)::int from registrations r join orders o on o.id = r.order_id where o.phone = customers.phone)` }).from(s.customers).orderBy(desc(s.customers.createdAt)).limit(200),
  ]);
  return (
    <div className="grid gap-8">
      <section>
        <h1 className="mb-1 text-2xl font-bold text-fairway-900">Message outbox</h1>
        <p className="mb-3 text-sm text-fairway-800/70">SMS, email and WhatsApp messages queued by the system. They are delivered when Africa&apos;s Talking (SMS) and Resend (email) credentials are configured. WhatsApp messages are sent by staff from this list.</p>
        <div className="grid gap-2">{notes.map((n) => <div key={n.id} className="card !p-3 text-sm"><span className="chip mr-2">{n.channel}</span><strong>{n.recipient}</strong> <span className="text-fairway-800/60">· {fmtDateTime(n.createdAt)} · {n.status}</span><p className="mt-1 break-words">{n.body}</p></div>)}{notes.length === 0 && <p className="text-fairway-800/70">Nothing yet.</p>}</div>
      </section>
      <section>
        <h2 className="mb-2 text-xl font-bold">Customers (latest)</h2>
        <div className="card overflow-x-auto !p-0"><table className="w-full min-w-[30rem] text-left text-sm"><thead className="bg-fairway-800 text-white"><tr><th className="p-3">Name</th><th>Phone</th><th>Email</th><th>Spend</th><th>Events</th><th>Marketing consent</th></tr></thead><tbody>{customers.map(({ c, spend, events }) => <tr key={c.id} className="border-t border-fairway-100"><td className="p-3">{c.name}</td><td>+{c.phone}</td><td>{c.email}</td><td>{kes(spend)}</td><td>{events}</td><td>{c.marketingConsent ? "✓ opted in" : "no"}</td></tr>)}</tbody></table></div>
      </section>
      <section>
        <h2 className="mb-2 text-xl font-bold">Audit log</h2>
        <div className="card !p-0"><ul className="divide-y divide-fairway-100 text-sm">{audit.map((a) => <li key={a.id} className="p-3"><strong>{a.action}</strong> · {a.detail} <span className="text-fairway-800/60">· {a.actor} · {fmtDateTime(a.createdAt)}</span></li>)}{audit.length === 0 && <li className="p-3 text-fairway-800/70">No changes logged yet.</li>}</ul></div>
      </section>
    </div>
  );
}
