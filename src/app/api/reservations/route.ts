import { db } from "@/db";
import * as s from "@/db/schema";
import { ensureSeed } from "@/lib/seed";
import { notify } from "@/lib/notify";
import { CLUB, normalizePhone, waLink } from "@/lib/constants";
import { todayStr, upsertCustomer, validDate, validTime } from "@/lib/commerce";

export const dynamic = "force-dynamic";

// Table reservations are free to book: confirmed immediately, details sent via WhatsApp link.
export async function POST(req: Request) {
  await ensureSeed();
  const b = await req.json().catch(() => ({}));
  if (b.website) return Response.json({ ok: true });
  const phone = normalizePhone(String(b.phone || ""));
  const name = String(b.name || "").trim().slice(0, 100);
  const date = String(b.date || "");
  const time = String(b.time || "");
  const guests = Math.max(1, Math.min(60, Math.floor(Number(b.guests)) || 2));
  if (!phone || !name) return Response.json({ ok: false, error: "Enter your name and a valid phone number." }, { status: 400 });
  if (!validDate(date) || date < todayStr() || !validTime(time))
    return Response.json({ ok: false, error: "Choose a future date and time." }, { status: 400 });
  await upsertCustomer({ phone, name, consent: !!b.consent });
  await db.insert(s.bookings).values({
    kind: "table",
    label: String(b.occasion || "Table reservation").slice(0, 60),
    date,
    time,
    qty: 1,
    guests,
    status: "confirmed",
    name,
    phone,
    details: { occasion: String(b.occasion || "").slice(0, 60) },
  });
  const msg = `Hello Nakuru Golf Club, I've reserved a table for ${guests} on ${date} at ${time} (${name}).`;
  await notify(
    { channel: "whatsapp", recipient: CLUB.whatsapp, body: `[Restaurant] ${msg}` },
    { channel: "sms", recipient: phone, body: `${CLUB.name}: your table for ${guests} is reserved on ${date} at ${time}. To change it, call ${CLUB.phoneDisplay}.` },
  );
  return Response.json({ ok: true, whatsapp: waLink(msg) });
}
