import { db } from "@/db";
import { eq } from "drizzle-orm";
import * as s from "@/db/schema";
import { CLUB, normalizePhone } from "./constants";

export const smsConfigured = () => !!(process.env.AT_API_KEY && process.env.AT_USERNAME);

export async function sendSms(phone: string, message: string) {
  if (!smsConfigured()) return false;
  const host = process.env.AT_USERNAME === "sandbox" ? "api.sandbox.africastalking.com" : "api.africastalking.com";
  try {
    const r = await fetch(`https://${host}/version1/messaging`, {
      method: "POST",
      headers: { apiKey: process.env.AT_API_KEY!, "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
      body: new URLSearchParams({ username: process.env.AT_USERNAME!, to: `+${phone}`, message }).toString(),
    });
    const j = await r.json();
    return r.ok && j?.SMSMessageData?.Recipients?.[0]?.status === "Success";
  } catch {
    return false;
  }
}

async function sendEmail(to: string, subject: string, text: string) {
  if (!process.env.RESEND_API_KEY || !process.env.EMAIL_FROM) return false;
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: process.env.EMAIL_FROM, to, subject, text }),
    });
    return r.ok;
  } catch {
    return false;
  }
}

type Msg = {
  channel: "sms" | "email" | "whatsapp";
  recipient: string;
  body: string;
  subject?: string;
  orderNumber?: string;
  dedupeKey?: string;
};

/** Records each message in the outbox and delivers SMS/email when a provider is configured. A dedupeKey is sent only once. */
export async function notify(...msgs: Msg[]) {
  for (const m of msgs) {
    const recipient = m.channel === "email" ? m.recipient : normalizePhone(m.recipient) || m.recipient;
    if (!recipient) continue;
    const [row] = await db
      .insert(s.notifications)
      .values({ channel: m.channel, recipient, body: m.body, orderNumber: m.orderNumber, dedupeKey: m.dedupeKey })
      .onConflictDoNothing()
      .returning();
    if (!row) continue;
    const sent =
      m.channel === "sms" ? await sendSms(recipient, m.body) : m.channel === "email" ? await sendEmail(recipient, m.subject || CLUB.name, m.body) : false;
    if (sent) await db.update(s.notifications).set({ status: "sent" }).where(eq(s.notifications.id, row.id));
  }
}
