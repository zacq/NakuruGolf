import { db } from "@/db";
import * as s from "@/db/schema";
import { and, eq, gt, inArray, isNotNull, lt, sql } from "drizzle-orm";
import { CLUB, eventDates, fmtDate } from "@/lib/constants";
import { todayStr } from "@/lib/commerce";
import { notify } from "@/lib/notify";
import { nairobiDate, plusDay } from "@/lib/queries";
import { safeEqual } from "@/lib/session";

export const dynamic = "force-dynamic";

const daysUntil = (from: string, to: string) => Math.round((Date.parse(to) - Date.parse(from)) / 86400000);

// NT-2, NT-3 and MB-5. Called every 15 minutes by netlify/functions/reminders.mts; dedupe keys make repeats harmless.
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || !safeEqual(req.headers.get("authorization") || "", `Bearer ${secret}`)) return new Response("Unauthorized", { status: 401 });

  const now = new Date();
  const today = todayStr();
  const tomorrow = plusDay(today);
  const hour = Number(now.toLocaleString("en-GB", { timeZone: "Africa/Nairobi", hour: "2-digit", hour12: false }));
  const daytime = hour >= 8 && hour < 20;

  await db.update(s.memberships).set({ status: "lapsed" }).where(and(eq(s.memberships.status, "active"), lt(s.memberships.renewalDue, now)));
  await db.update(s.bookings).set({ status: "cancelled" }).where(and(eq(s.bookings.source, "staff"), eq(s.bookings.status, "held"), lt(s.bookings.holdExpires, now)));

  // table and car wash: two hours before
  const slots = await db
    .select()
    .from(s.bookings)
    .where(and(inArray(s.bookings.kind, ["table", "carwash"]), eq(s.bookings.status, "confirmed"), eq(s.bookings.date, today)));
  for (const b of slots) {
    const mins = (Date.parse(`${b.date}T${b.time}:00+03:00`) - now.getTime()) / 60000;
    if (!b.phone || !(mins > 0 && mins <= 120)) continue;
    const what = b.kind === "table" ? `your table for ${b.guests}` : `your car wash (${b.label})`;
    await notify({ channel: "sms", recipient: b.phone, dedupeKey: `slot:${b.id}`, body: `${CLUB.name}: reminder, ${what} is today at ${b.time}.` });
  }

  if (daytime) {
    const arrivals = await db.select().from(s.bookings).where(and(eq(s.bookings.kind, "room"), eq(s.bookings.status, "confirmed"), eq(s.bookings.date, tomorrow)));
    for (const b of arrivals)
      if (b.phone)
        await notify({
          channel: "sms",
          recipient: b.phone,
          dedupeKey: `room:${b.id}`,
          body: `${CLUB.name}: we look forward to your stay tomorrow (${b.label}). Reception opens 7am; we are ${CLUB.address}. Questions: ${CLUB.phoneDisplay}`,
        });

    const events = await db.select().from(s.events).where(and(gt(s.events.endsAt, sql`now() - interval '3 days'`), lt(s.events.startsAt, sql`now() + interval '4 days'`)));
    const upcoming = await db.select().from(s.events).where(gt(s.events.startsAt, now)).orderBy(s.events.startsAt);
    for (const e of events) {
      const left = daysUntil(today, nairobiDate(e.startsAt));
      const ended = new Date(e.endsAt) < now;
      if (left !== 3 && left !== 1 && !ended) continue;
      const guests = await db
        .selectDistinct({ phone: s.orders.phone, orderNumber: s.orders.number })
        .from(s.registrations)
        .innerJoin(s.orders, eq(s.orders.id, s.registrations.orderId))
        .where(eq(s.registrations.eventId, e.id));
      const next = upcoming.find((x) => x.id !== e.id);
      for (const g of guests) {
        const thanks = `${CLUB.name}: thank you for joining the ${e.name}. Results and photos: ${CLUB.url}/events/${e.slug}. We'd love your review: reply on WhatsApp ${CLUB.phoneDisplay}.${next ? ` Next: ${next.name}, ${eventDates(next.startsAt, next.endsAt)}.` : ""}`;
        const reminder = `${CLUB.name}: ${e.name} starts ${left === 1 ? "tomorrow" : "in 3 days"} (${fmtDate(e.startsAt)}). Your QR ticket: ${CLUB.url}/orders/${g.orderNumber}`;
        await notify({ channel: "sms", recipient: g.phone, dedupeKey: ended ? `event:${e.id}:thanks:${g.phone}` : `event:${e.id}:${left}:${g.phone}`, body: ended ? thanks : reminder });
      }
    }

    const due = await db
      .select()
      .from(s.memberships)
      .where(and(eq(s.memberships.status, "active"), isNotNull(s.memberships.renewalDue), lt(s.memberships.renewalDue, sql`now() + interval '30 days'`)));
    for (const m of due) {
      const date = nairobiDate(m.renewalDue!);
      const stage = daysUntil(today, date) <= 7 ? 7 : 30;
      const body = `${CLUB.name}: your membership renewal is due on ${fmtDate(m.renewalDue!)}. Renew by M-Pesa: ${CLUB.url}/account`;
      await notify(
        { channel: "sms", recipient: m.phone, dedupeKey: `renew:${m.id}:${date}:${stage}:sms`, body },
        { channel: "email", recipient: m.email || "", subject: "Membership renewal", dedupeKey: `renew:${m.id}:${date}:${stage}:email`, body },
      );
    }
  }
  return Response.json({ ok: true });
}
